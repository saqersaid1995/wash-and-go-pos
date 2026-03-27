import { supabase } from "@/integrations/supabase/client";

/**
 * Award loyalty points to a customer based on paid amount.
 * Only awards if loyalty is enabled and customer exists.
 */
export async function awardLoyaltyPoints(
  customerId: string,
  orderId: string,
  paidAmount: number
) {
  // Check if loyalty is enabled
  const { data: settings } = await supabase
    .from("loyalty_settings")
    .select("is_enabled, earn_points_rate")
    .limit(1)
    .single();

  if (!(settings as any)?.is_enabled) return;

  const earnRate = (settings as any).earn_points_rate ?? 1;
  const pointsToEarn = Math.floor(paidAmount * earnRate);
  if (pointsToEarn <= 0) return;

  // Upsert customer_loyalty
  const { data: existing } = await supabase
    .from("customer_loyalty")
    .select("id, points_balance, total_earned")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("customer_loyalty")
      .update({
        points_balance: (existing as any).points_balance + pointsToEarn,
        total_earned: (existing as any).total_earned + pointsToEarn,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", (existing as any).id);
  } else {
    await supabase.from("customer_loyalty").insert({
      customer_id: customerId,
      points_balance: pointsToEarn,
      total_earned: pointsToEarn,
    } as any);
  }

  // Log transaction
  await supabase.from("loyalty_transactions").insert({
    customer_id: customerId,
    order_id: orderId,
    type: "earn",
    points: pointsToEarn,
    description: `Earned ${pointsToEarn} points from order`,
  } as any);
}

/**
 * Redeem loyalty points for a customer.
 */
export async function redeemLoyaltyPoints(
  customerId: string,
  orderId: string,
  pointsToRedeem: number,
  discountAmount: number
) {
  if (pointsToRedeem <= 0) return;

  const { data: existing } = await supabase
    .from("customer_loyalty")
    .select("id, points_balance, total_redeemed")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!existing || (existing as any).points_balance < pointsToRedeem) return;

  await supabase
    .from("customer_loyalty")
    .update({
      points_balance: (existing as any).points_balance - pointsToRedeem,
      total_redeemed: (existing as any).total_redeemed + pointsToRedeem,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", (existing as any).id);

  await supabase.from("loyalty_transactions").insert({
    customer_id: customerId,
    order_id: orderId,
    type: "redeem",
    points: pointsToRedeem,
    description: `Redeemed ${pointsToRedeem} points for ${discountAmount} OMR discount`,
  } as any);
}
