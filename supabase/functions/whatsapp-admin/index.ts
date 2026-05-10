import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function mask(value: string | undefined | null, keep = 4): string {
  if (!value) return "";
  if (value.length <= keep) return "•".repeat(value.length);
  return "•".repeat(Math.max(value.length - keep, 4)) + value.slice(-keep);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: require admin
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin only" }, 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (await safeJson(req))?.action;
    const body = req.method === "POST" ? await safeJson(req) : null;

    const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
    const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
    const VERIFY_TOKEN = Deno.env.get("VERIFY_TOKEN") || Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
    const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";

    // Load settings (graph version)
    const { data: settings } = await admin.from("whatsapp_settings").select("*").limit(1).maybeSingle();
    const GRAPH_VERSION = settings?.graph_api_version || "v18.0";

    if (action === "status") {
      // Last success / failure from notification_logs
      const [{ data: lastSuccess }, { data: lastFailure }, { data: lastIncoming }] = await Promise.all([
        admin.from("notification_logs").select("created_at").eq("send_status", "sent")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("notification_logs").select("created_at, error_message").eq("send_status", "failed")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("whatsapp_messages").select("created_at").eq("type", "incoming")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Token health: hit Graph API
      let tokenHealthy = false;
      let displayPhone = "";
      let healthError = "";
      if (TOKEN && PHONE_ID) {
        try {
          const res = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_ID}?fields=display_phone_number,verified_name`,
            { headers: { Authorization: `Bearer ${TOKEN}` } },
          );
          const data = await res.json();
          if (res.ok) {
            tokenHealthy = true;
            displayPhone = data.display_phone_number || "";
          } else {
            healthError = data?.error?.message || `HTTP ${res.status}`;
          }
        } catch (e) {
          healthError = String(e);
        }
      } else {
        healthError = "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID";
      }

      const projectId = supabaseUrl.replace("https://", "").split(".")[0];
      const webhookUrl = `https://${projectId}.functions.supabase.co/whatsapp-webhook`;

      return json({
        connected: tokenHealthy,
        token_healthy: tokenHealthy,
        token_health_error: healthError,
        masked_token: mask(TOKEN, 6),
        masked_phone_number_id: mask(PHONE_ID, 4),
        display_phone_number: displayPhone,
        graph_api_version: GRAPH_VERSION,
        last_success_at: lastSuccess?.created_at || null,
        last_failure_at: lastFailure?.created_at || null,
        last_failure_message: lastFailure?.error_message || null,
        last_incoming_at: lastIncoming?.created_at || null,
        webhook_url: webhookUrl,
        masked_verify_token: mask(VERIFY_TOKEN, 4),
        masked_app_secret: mask(APP_SECRET, 4),
        has_verify_token: !!VERIFY_TOKEN,
        has_app_secret: !!APP_SECRET,
      });
    }

    if (action === "test_connection") {
      if (!TOKEN || !PHONE_ID) return json({ success: false, error: "Missing credentials" });
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating`,
        { headers: { Authorization: `Bearer ${TOKEN}` } },
      );
      const data = await res.json();
      return json({ success: res.ok, status: res.status, data });
    }

    if (action === "test_template") {
      const phone = String(body?.phone || "").replace(/\D/g, "");
      const templateName = String(body?.template_name || "");
      const language = String(body?.language || "ar");
      if (!phone || !templateName) return json({ success: false, error: "phone and template_name required" }, 400);
      if (!TOKEN || !PHONE_ID) return json({ success: false, error: "Missing credentials" }, 400);

      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_ID}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: { name: templateName, language: { code: language } },
          }),
        },
      );
      const data = await res.json();
      return json({ success: res.ok, status: res.status, data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("whatsapp-admin error:", error);
    return json({ error: String(error) }, 500);
  }
});

async function safeJson(req: Request): Promise<any> {
  try {
    return await req.clone().json();
  } catch {
    return null;
  }
}
