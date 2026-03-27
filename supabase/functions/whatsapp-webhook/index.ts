import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = "lavinderia_whatsapp_verify_2024";

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET: Webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST: Incoming messages
  if (req.method === "POST") {
    try {
      const body = await req.json();

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Parse WhatsApp Cloud API payload
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || value.messaging_product !== "whatsapp") continue;

          const messages = value.messages || [];
          const contacts = value.contacts || [];

          // Also capture outgoing message statuses if needed later
          for (const msg of messages) {
            const phone = msg.from || "";
            const waMessageId = msg.id || null;
            const timestamp = msg.timestamp
              ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let messageText = "";
            if (msg.type === "text" && msg.text?.body) {
              messageText = msg.text.body;
            } else if (msg.type === "image") {
              messageText = "[Image]" + (msg.image?.caption ? ` ${msg.image.caption}` : "");
            } else if (msg.type === "document") {
              messageText = "[Document]" + (msg.document?.filename ? ` ${msg.document.filename}` : "");
            } else if (msg.type === "audio") {
              messageText = "[Audio message]";
            } else if (msg.type === "video") {
              messageText = "[Video]";
            } else if (msg.type === "location") {
              messageText = "[Location]";
            } else if (msg.type === "sticker") {
              messageText = "[Sticker]";
            } else if (msg.type === "reaction") {
              messageText = `[Reaction: ${msg.reaction?.emoji || ""}]`;
            } else {
              messageText = `[${msg.type || "unknown"}]`;
            }

            // Try to match customer by phone
            // Normalize: strip leading country code variations
            let customerId: string | null = null;
            const phoneDigits = phone.replace(/\D/g, "");

            // Try exact match and partial match
            const { data: customer } = await supabase
              .from("customers")
              .select("id, phone_number")
              .or(`phone_number.eq.${phoneDigits},phone_number.eq.${phoneDigits.slice(-8)}`)
              .limit(1)
              .maybeSingle();

            if (!customer) {
              // Try matching last 8 digits
              const last8 = phoneDigits.slice(-8);
              const { data: customer2 } = await supabase
                .from("customers")
                .select("id")
                .ilike("phone_number", `%${last8}`)
                .limit(1)
                .maybeSingle();
              if (customer2) customerId = customer2.id;
            } else {
              customerId = customer.id;
            }

            // Insert message
            const { error: insertError } = await supabase
              .from("whatsapp_messages")
              .insert({
                phone: phoneDigits,
                message: messageText,
                type: "incoming",
                customer_id: customerId,
                wa_message_id: waMessageId,
                message_timestamp: timestamp,
              });

            if (insertError) {
              console.error("Insert error:", insertError);
            } else {
              console.log(`Saved message from ${phoneDigits}`);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Webhook error:", err);
      return new Response(
        JSON.stringify({ error: String(err) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
