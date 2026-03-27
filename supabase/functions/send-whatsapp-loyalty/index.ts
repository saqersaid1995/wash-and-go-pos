import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API_VERSION = "v18.0";

function normalizePhone(phone: string, defaultCountryCode = "968"): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 7) return null;
  if (digits.startsWith("968") && digits.length === 11) return digits;
  if (digits.length === 8) return defaultCountryCode + digits;
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

    if (!WHATSAPP_ACCESS_TOKEN) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    if (!WHATSAPP_PHONE_NUMBER_ID) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      order_id,
      customer_id,
      customer_phone,
      points_earned,      // {{1}}
      total_points,        // {{2}}
      min_redeem_points,   // {{3}}
      remaining_to_redeem, // {{4}}
      max_redemption_pct,  // {{5}}
    } = body;

    if (!customer_phone) {
      return new Response(
        JSON.stringify({ error: "Missing required field: customer_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhone(customer_phone);
    if (!normalizedPhone) {
      await supabase.from("notification_logs").insert({
        order_id: order_id || null,
        customer_id: customer_id || null,
        channel: "whatsapp",
        recipient_phone: customer_phone,
        message_type: "loyalty_update",
        send_status: "skipped",
        error_message: "Invalid phone number format",
      });

      return new Response(
        JSON.stringify({ success: false, status: "skipped", error: "Invalid phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template message with 5 body parameters
    const requestBody = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: "loyalty_progress_update_ar",
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(points_earned) },
              { type: "text", text: String(total_points) },
              { type: "text", text: String(min_redeem_points) },
              { type: "text", text: String(remaining_to_redeem) },
              { type: "text", text: String(max_redemption_pct) },
            ],
          },
        ],
      },
    };

    const messageDescription = `Template: loyalty_progress_update_ar | To: ${normalizedPhone} | Earned: ${points_earned} | Total: ${total_points}`;
    console.log("Sending loyalty WhatsApp:", messageDescription);

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const waResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const waData = await waResponse.json();
    console.log("WhatsApp API response:", JSON.stringify(waData, null, 2));

    if (!waResponse.ok) {
      const errorMsg = waData?.error?.message || `HTTP ${waResponse.status}`;

      await supabase.from("notification_logs").insert({
        order_id: order_id || null,
        customer_id: customer_id || null,
        channel: "whatsapp",
        recipient_phone: normalizedPhone,
        message_type: "loyalty_update",
        message_body: messageDescription,
        send_status: "failed",
        provider_response: JSON.stringify(waData),
        error_message: errorMsg,
      });

      // Still mark as sent to prevent retries
      if (order_id) {
        await supabase.from("orders").update({ loyalty_whatsapp_sent: true }).eq("id", order_id);
      }

      return new Response(
        JSON.stringify({ success: false, status: "failed", error: errorMsg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = waData?.messages?.[0]?.id || null;

    await supabase.from("notification_logs").insert({
      order_id: order_id || null,
      customer_id: customer_id || null,
      channel: "whatsapp",
      recipient_phone: normalizedPhone,
      message_type: "loyalty_update",
      message_body: messageDescription,
      send_status: "sent",
      provider_message_id: messageId,
      provider_response: JSON.stringify(waData),
    });

    // Save to whatsapp_messages for inbox display
    await supabase.from("whatsapp_messages").insert({
      phone: normalizedPhone,
      message: `[Template: loyalty_progress_update_ar] نقاط مكتسبة: ${points_earned} | الرصيد: ${total_points}`,
      type: "outgoing",
      customer_id: customer_id || null,
      order_id: order_id || null,
      wa_message_id: messageId,
      message_timestamp: new Date().toISOString(),
    });

    // Mark order so we don't send again
    if (order_id) {
      await supabase.from("orders").update({ loyalty_whatsapp_sent: true }).eq("id", order_id);
    }

    return new Response(
      JSON.stringify({ success: true, status: "sent", message_id: messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-whatsapp-loyalty error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
