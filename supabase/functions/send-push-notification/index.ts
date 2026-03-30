import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto helpers for VAPID
async function generateVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  // JWT header + payload
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const enc = new TextEncoder();

  function base64urlEncode(data: Uint8Array): string {
    let binary = "";
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64urlEncodeStr(str: string): string {
    return base64urlEncode(enc.encode(str));
  }

  function base64urlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  const headerB64 = base64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = base64urlEncodeStr(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privKeyBytes = base64urlDecode(vapidPrivateKey);
  const pubKeyBytes = base64urlDecode(vapidPublicKey);

  // Build raw key: 0x04 + x(32) + y(32) from uncompressed public key
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64urlEncode(pubKeyBytes.slice(1, 33)),
    y: base64urlEncode(pubKeyBytes.slice(33, 65)),
    d: base64urlEncode(privKeyBytes),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsignedToken)
  );

  // Convert DER-like signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  const jwt = `${unsignedToken}.${base64urlEncode(sigBytes)}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
  };
}

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const { authorization } = await generateVapidAuthHeader(
      sub.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      "mailto:support@lavinderia.com"
    );

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        TTL: "86400",
      },
      body: payload,
    });

    if (!res.ok) {
      console.error(`Push failed (${res.status}):`, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Push send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, customerName, appContext } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const context = appContext || "support-lite";

    // Get all push subscriptions for this app context
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("app_context", context);

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = "Lavinderia Support";
    const body = customerName
      ? `New message from ${customerName}`
      : `New message from ${phone}`;
    const preview = message?.substring(0, 100) || "";

    const payload = JSON.stringify({
      title,
      body,
      preview,
      phone,
      url: "/support-lite",
      tag: `support-${phone}`,
    });

    let sent = 0;
    const stale: string[] = [];

    for (const sub of subscriptions) {
      const ok = await sendPushToSubscription(
        sub,
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      if (ok) {
        sent++;
      } else {
        stale.push(sub.id);
      }
    }

    // Clean up stale subscriptions
    if (stale.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }

    // Also update badge count: count unread conversations
    const { data: unreadData } = await supabase
      .from("whatsapp_messages")
      .select("phone")
      .eq("type", "incoming")
      .eq("is_read", false)
      .eq("is_deleted", false);

    const unreadConversations = new Set(unreadData?.map((m: any) => m.phone) || []).size;

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, stale: stale.length, unreadConversations }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
