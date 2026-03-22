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
      template_name = "order_ready_v2",
      template_language = "ar",
      is_test = false,
    } = body;

    if (!customer_phone) {
      return new Response(
        JSON.stringify({ error: "Missing required field: customer_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(customer_phone);
    if (!normalizedPhone) {
      const logData: Record<string, unknown> = {
        order_id: order_id || null,
        customer_id: customer_id || null,
        channel: "whatsapp",
        recipient_phone: customer_phone,
        message_type,
        send_status: "skipped",
        error_message: "Invalid phone number format",
      };
      await supabase.from("notification_logs").insert(logData);

      return new Response(
        JSON.stringify({ success: false, status: "skipped", error: "Invalid phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template message payload
    const name = customer_name || "Customer";
    const total = Number(total_amount || 0).toFixed(3);
    const orderNum = order_number || "N/A";

    const requestBody = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: template_name,
        language: { code: template_language },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: orderNum },
              { type: "text", text: total },
            ],
          },
        ],
      },
    };

    const messageDescription = `Template: ${template_name} | To: ${normalizedPhone} | Name: ${name} | Order: ${orderNum} | Total: ${total}`;
    console.log("Sending WhatsApp:", messageDescription);
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // Send via Meta WhatsApp Cloud API
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
      const errorCode = waData?.error?.code;

      // Log failure
      await supabase.from("notification_logs").insert({
        order_id: order_id || null,
        customer_id: customer_id || null,
        channel: "whatsapp",
        recipient_phone: normalizedPhone,
        message_type: is_test ? "test" : message_type,
        message_body: messageDescription,
        send_status: "failed",
        provider_response: JSON.stringify(waData),
        error_message: errorMsg,
      });

      // Flag order if applicable
      if (order_id) {
        await supabase
          .from("orders")
          .update({ ready_pickup_whatsapp_sent: true })
          .eq("id", order_id);
      }

      // Check for token expiry
      const isTokenError = errorCode === 190 || errorMsg?.toLowerCase().includes("token");

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          error: errorMsg,
          is_token_error: isTokenError,
          provider_response: waData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = waData?.messages?.[0]?.id || null;

    // Log success
    await supabase.from("notification_logs").insert({
      order_id: order_id || null,
      customer_id: customer_id || null,
      channel: "whatsapp",
      recipient_phone: normalizedPhone,
      message_type: is_test ? "test" : message_type,
      message_body: messageDescription,
      send_status: "sent",
      provider_message_id: messageId,
      provider_response: JSON.stringify(waData),
    });

    // Mark order if applicable
    if (order_id) {
      await supabase
        .from("orders")
        .update({ ready_pickup_whatsapp_sent: true })
        .eq("id", order_id);
    }

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
