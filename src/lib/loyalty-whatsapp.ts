import { supabase } from "@/integrations/supabase/client";
import { sendLoyaltyWhatsApp } from "@/lib/whatsapp";

/**
 * Send loyalty progress WhatsApp after a payment is confirmed as "paid".
 * Checks:
 *  - loyalty is enabled
 *  - customer has a phone
 *  - loyalty_whatsapp_sent is false (prevent duplicates)
 */
export async function triggerLoyaltyWhatsApp(
  orderId: string,
  customerId: string,
  customerPhone: string,
  paidAmount: number
) {
  try {
    // 1. Check loyalty settings
    const { data: settings } = await supabase
      .from("loyalty_settings")
      .select("is_enabled, earn_points_rate, redeem_points_rate, max_redemption_percent")
      .limit(1)
      .single();

    if (!(settings as any)?.is_enabled) return;

    const earnRate = (settings as any).earn_points_rate ?? 1;
    const redeemRate = (settings as any).redeem_points_rate ?? 50;
    const maxPct = (settings as any).max_redemption_percent ?? 20;

    // 2. Check if already sent for this order
    const { data: order } = await supabase
      .from("orders")
      .select("loyalty_whatsapp_sent")
      .eq("id", orderId)
      .single();

    if ((order as any)?.loyalty_whatsapp_sent) return;

    // 3. Calculate points earned from this payment
    const pointsEarned = parseFloat((paidAmount * earnRate).toFixed(2));
    if (pointsEarned <= 0) return;

    // 4. Get customer's current loyalty balance (after earning was already applied)
    const { data: loyalty } = await supabase
      .from("customer_loyalty")
      .select("points_balance")
      .eq("customer_id", customerId)
      .maybeSingle();

    const totalPoints = parseFloat(((loyalty as any)?.points_balance ?? pointsEarned).toFixed(2));

    // 5. Calculate remaining to redeem
    const minRedeemPoints = redeemRate; // e.g. 30 points = 1 OMR
    const remainingToRedeem = totalPoints >= minRedeemPoints
      ? 0
      : parseFloat((minRedeemPoints - totalPoints).toFixed(2));

    // 6. Send WhatsApp
    const result = await sendLoyaltyWhatsApp({
      orderId,
      customerId,
      customerPhone,
      pointsEarned,
      totalPoints,
      minRedeemPoints,
      remainingToRedeem,
      maxRedemptionPct: maxPct,
    });

    if (result.success) {
      console.log("Loyalty WhatsApp sent successfully for order", orderId);
    } else {
      console.warn("Loyalty WhatsApp failed for order", orderId, result.error);
    }
  } catch (err) {
    console.error("triggerLoyaltyWhatsApp error:", err);
  }
}
