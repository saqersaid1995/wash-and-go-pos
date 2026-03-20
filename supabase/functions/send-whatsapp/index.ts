import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API_VERSION = "v21.0";

function normalizePhone(phone: string, defaultCountryCode = "968"): string | null {
  // Strip all non-digits
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 7) return null;

  // Already has country code
  if (digits.startsWith("968") && digits.length === 11) return digits;
  // 8-digit Oman local number
  if (digits.length === 8) return defaultCountryCode + digits;
  // If it starts with + already stripped, check length
  if (digits.length >= 10) return digits;

  return defaultCountryCode + digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }
    if (!WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      order_id,
      customer_id,
      customer_name,
      customer_phone,
      order_number,
      total_amount,
      remaining_amount,
      message_type = "ready_for_pickup",
    } = body;

    if (!order_id || !customer_phone || !order_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id, customer_phone, order_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(customer_phone);
    if (!normalizedPhone) {
      // Log as skipped
      await supabase.from("notification_logs").insert({
        order_id,
        customer_id: customer_id || null,
        channel: "whatsapp",
        recipient_phone: customer_phone,
        message_type,
        send_status: "skipped",
        error_message: "Invalid phone number format",
      });

      return new Response(
        JSON.stringify({ success: false, status: "skipped", error: "Invalid phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message
    const name = customer_name || "Customer";
    const total = Number(total_amount || 0).toFixed(3);
    const remaining = Number(remaining_amount || 0).toFixed(3);

    const messageBody = `Hello ${name},

Your laundry order ${order_number} is now ready for pickup.

Please visit LAVANDERIA to collect your clothes.

Total: ${total} OMR
Remaining balance: ${remaining} OMR

Thank you.`;

    // Send via Meta WhatsApp Cloud API
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const waResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: { body: messageBody },
      }),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      // Log failure
      await supabase.from("notification_logs").insert({
        order_id,
        customer_id: customer_id || null,
        channel: "whatsapp",
        recipient_phone: normalizedPhone,
        message_type,
        message_body: messageBody,
        send_status: "failed",
        provider_response: JSON.stringify(waData),
        error_message: waData?.error?.message || `HTTP ${waResponse.status}`,
      });

      // Mark order flag so we don't retry automatically
      await supabase
        .from("orders")
        .update({ ready_pickup_whatsapp_sent: true })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          error: waData?.error?.message || "WhatsApp API error",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = waData?.messages?.[0]?.id || null;

    // Log success
    await supabase.from("notification_logs").insert({
      order_id,
      customer_id: customer_id || null,
      channel: "whatsapp",
      recipient_phone: normalizedPhone,
      message_type,
      message_body: messageBody,
      send_status: "sent",
      provider_message_id: messageId,
      provider_response: JSON.stringify(waData),
    });

    // Mark order
    await supabase
      .from("orders")
      .update({ ready_pickup_whatsapp_sent: true })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({ success: true, status: "sent", message_id: messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-whatsapp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
