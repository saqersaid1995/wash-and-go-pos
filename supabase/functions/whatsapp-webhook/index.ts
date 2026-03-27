import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = "lavinderia_whatsapp_verify_2024";
const GRAPH_API_VERSION = "v18.0";

async function downloadAndStoreMedia(
  mediaId: string,
  accessToken: string,
  supabase: any,
  fileExtension: string
): Promise<string | null> {
  try {
    // Step 1: Get download URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      console.error("Meta media lookup failed:", metaRes.status);
      return null;
    }
    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    if (!downloadUrl) return null;

    // Step 2: Download the actual binary from WhatsApp CDN
    const mediaRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) {
      console.error("Media download failed:", mediaRes.status);
      return null;
    }
    const blob = await mediaRes.blob();
    const mimeType = metaData.mime_type || mediaRes.headers.get("content-type") || "application/octet-stream";

    // Step 3: Upload to Supabase Storage
    const fileName = `${mediaId}.${fileExtension}`;
    const filePath = `media/${fileName}`;
    
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, uint8, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    // Step 4: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    console.log(`Media stored: ${filePath}`);
    return publicUrlData?.publicUrl || null;
  } catch (e) {
    console.error("downloadAndStoreMedia error:", e);
    return null;
  }
}

function getExtensionForType(msgType: string, mimeType?: string): string {
  if (mimeType) {
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("pdf")) return "pdf";
  }
  switch (msgType) {
    case "image": return "jpg";
    case "audio": return "ogg";
    case "video": return "mp4";
    case "document": return "pdf";
    case "sticker": return "webp";
    default: return "bin";
  }
}

Deno.serve(async (req) => {
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
      const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
      const supabase = createClient(supabaseUrl, supabaseKey);

      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || value.messaging_product !== "whatsapp") continue;

          const messages = value.messages || [];

          for (const msg of messages) {
            const phone = msg.from || "";
            const waMessageId = msg.id || null;
            const timestamp = msg.timestamp
              ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let messageText = "";
            let messageType = "text";
            let mediaId: string | null = null;
            let mediaUrl: string | null = null;
            let filename: string | null = null;

            if (msg.type === "text" && msg.text?.body) {
              messageText = msg.text.body;
              messageType = "text";
            } else if (msg.type === "image") {
              messageType = "image";
              mediaId = msg.image?.id || null;
              messageText = msg.image?.caption || "[Image]";
              if (mediaId && accessToken) {
                const ext = getExtensionForType("image", msg.image?.mime_type);
                mediaUrl = await downloadAndStoreMedia(mediaId, accessToken, supabase, ext);
              }
            } else if (msg.type === "audio") {
              messageType = "audio";
              mediaId = msg.audio?.id || null;
              messageText = "[Voice note]";
              if (mediaId && accessToken) {
                const ext = getExtensionForType("audio", msg.audio?.mime_type);
                mediaUrl = await downloadAndStoreMedia(mediaId, accessToken, supabase, ext);
              }
            } else if (msg.type === "document") {
              messageType = "document";
              mediaId = msg.document?.id || null;
              filename = msg.document?.filename || null;
              messageText = filename ? `[Document] ${filename}` : "[Document]";
              if (mediaId && accessToken) {
                const ext = getExtensionForType("document", msg.document?.mime_type);
                mediaUrl = await downloadAndStoreMedia(mediaId, accessToken, supabase, ext);
              }
            } else if (msg.type === "video") {
              messageType = "video";
              mediaId = msg.video?.id || null;
              messageText = "[Video]";
              if (mediaId && accessToken) {
                const ext = getExtensionForType("video", msg.video?.mime_type);
                mediaUrl = await downloadAndStoreMedia(mediaId, accessToken, supabase, ext);
              }
            } else if (msg.type === "sticker") {
              messageType = "sticker";
              mediaId = msg.sticker?.id || null;
              messageText = "[Sticker]";
              if (mediaId && accessToken) {
                const ext = getExtensionForType("sticker", msg.sticker?.mime_type);
                mediaUrl = await downloadAndStoreMedia(mediaId, accessToken, supabase, ext);
              }
            } else if (msg.type === "location") {
              messageType = "location";
              messageText = "[Location]";
            } else if (msg.type === "reaction") {
              messageType = "reaction";
              messageText = `[Reaction: ${msg.reaction?.emoji || ""}]`;
            } else {
              messageType = msg.type || "unknown";
              messageText = `[${msg.type || "unknown"}]`;
            }

            // Match customer by phone
            const phoneDigits = phone.replace(/\D/g, "");
            let customerId: string | null = null;

            const { data: customer } = await supabase
              .from("customers")
              .select("id, phone_number")
              .or(`phone_number.eq.${phoneDigits},phone_number.eq.${phoneDigits.slice(-8)}`)
              .limit(1)
              .maybeSingle();

            if (!customer) {
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

            const { error: insertError } = await supabase
              .from("whatsapp_messages")
              .insert({
                phone: phoneDigits,
                message: messageText,
                type: "incoming",
                message_type: messageType,
                media_id: mediaId,
                media_url: mediaUrl,
                filename,
                customer_id: customerId,
                wa_message_id: waMessageId,
                message_timestamp: timestamp,
                send_status: "sent",
                is_read: false,
              });

            if (insertError) {
              console.error("Insert error:", insertError);
            } else {
              console.log(`Saved ${messageType} message from ${phoneDigits}, media: ${mediaUrl ? 'stored' : 'none'}`);
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
