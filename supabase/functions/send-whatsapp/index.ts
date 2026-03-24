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

// ─── PDF Generation ───

function buildInvoiceHtml(order: any, items: any[]): string {
  const rows = items
    .map(
      (i: any) =>
        `<tr><td>${i.item_type || "—"}</td><td>${i.service_type || "—"}</td><td class="c">${i.quantity}</td><td class="r">OMR ${(Number(i.unit_price) * i.quantity).toFixed(3)}</td></tr>`
    )
    .join("");

  const total = Number(order.total_amount || 0).toFixed(3);
  const paid = Number(order.paid_amount || 0).toFixed(3);
  const remaining = Number(order.remaining_amount || 0).toFixed(3);

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#000;width:210mm;padding:15mm}
h1{font-size:20px;text-align:center;margin-bottom:4px}
.tagline{text-align:center;font-size:11px;color:#666;margin-bottom:12px}
.divider{border:0;border-top:1px solid #ccc;margin:8px 0}
.info{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;margin-bottom:8px}
.label{color:#666}
table{width:100%;border-collapse:collapse;font-size:11px;margin:8px 0}
th{text-align:left;padding:4px 2px;border-bottom:2px solid #333;font-size:10px;text-transform:uppercase;color:#666}
td{padding:4px 2px;border-bottom:1px solid #eee}
.c{text-align:center}.r{text-align:right}
.totals{margin-top:8px;font-size:12px}
.totals div{display:flex;justify-content:space-between;padding:2px 0}
.totals .total{font-size:14px;font-weight:700}
.totals .remaining{color:#c1121f}
.footer{text-align:center;font-size:10px;color:#999;margin-top:16px}
</style></head><body>
<h1>LAVANDERIA</h1>
<p class="tagline">Professional Laundry Services</p>
<hr class="divider"/>
<div class="info">
<div><span class="label">Order: </span><strong>${order.order_number}</strong></div>
<div><span class="label">Date: </span><strong>${order.order_date}</strong></div>
<div><span class="label">Customer: </span><strong>${order.customer_name || "Walk-in"}</strong></div>
<div><span class="label">Phone: </span><strong>${order.customer_phone || "—"}</strong></div>
${order.delivery_date ? `<div><span class="label">Delivery: </span><strong>${order.delivery_date}</strong></div>` : ""}
</div>
<hr class="divider"/>
<table><thead><tr><th>Item</th><th>Service</th><th class="c">Qty</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
<hr class="divider"/>
<div class="totals">
<div class="total"><span>Total</span><span>OMR ${total}</span></div>
<div><span class="label">Paid</span><span>OMR ${paid}</span></div>
${Number(remaining) > 0 ? `<div class="remaining"><span>Remaining</span><span>OMR ${remaining}</span></div>` : ""}
</div>
<p class="footer">Thank you for your business!</p>
</body></html>`;
}

async function generatePdfFromHtml(html: string): Promise<Uint8Array> {
  // Use a public HTML-to-PDF API (jspdf alternative via browserless-like service)
  // Fallback: generate a simple text-based PDF manually
  // We'll use a minimal PDF builder since we can't rely on external services
  return buildMinimalPdf(html);
}

function buildMinimalPdf(html: string): Uint8Array {
  // Extract text content from HTML for a simple PDF
  const textContent = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = textContent.split("\n").filter((l) => l.trim());
  const encoder = new TextEncoder();

  // Build a valid PDF with text content
  const pdfLines: string[] = [];
  pdfLines.push("%PDF-1.4");

  // Catalog
  pdfLines.push("1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj");

  // Pages
  pdfLines.push("2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj");

  // Build stream content
  const streamLines: string[] = [];
  streamLines.push("BT");
  streamLines.push("/F1 11 Tf");

  let y = 780;
  for (const line of lines) {
    if (y < 40) break;
    const safe = line
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .substring(0, 90);
    if (!safe) continue;
    streamLines.push(`1 0 0 1 40 ${y} Tm`);
    streamLines.push(`(${safe}) Tj`);
    y -= 14;
  }
  streamLines.push("ET");
  const streamContent = streamLines.join("\n");

  // Page
  pdfLines.push(
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj`
  );

  // Stream
  pdfLines.push(`4 0 obj<</Length ${streamContent.length}>>\nstream\n${streamContent}\nendstream\nendobj`);

  // Font
  pdfLines.push("5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj");

  // XRef and trailer
  const body = pdfLines.join("\n");
  const xrefOffset = body.length;
  const trailer = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000${(body.indexOf("5 0 obj") + 9).toString().padStart(3, "0")} 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`;

  const fullPdf = body + "\n" + trailer;
  return encoder.encode(fullPdf);
}

// ─── Main Handler ───

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
      customer_name,
      customer_phone,
      order_number,
      total_amount,
      remaining_amount,
      message_type = "ready_for_pickup",
      template_name = "order_ready_pdf_ar",
      template_language = "ar",
      is_test = false,
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
        message_type,
        send_status: "skipped",
        error_message: "Invalid phone number format",
      } as any);

      return new Response(
        JSON.stringify({ success: false, status: "skipped", error: "Invalid phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Fetch order details and generate PDF ───
    let pdfBase64: string | null = null;
    let pdfFilename = `invoice_${order_number || "unknown"}.pdf`;

    if (order_id) {
      // Fetch full order with items
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, order_items(*), customers(full_name, phone_number)")
        .eq("id", order_id)
        .maybeSingle();

      if (orderData) {
        const orderForPdf = {
          ...orderData,
          customer_name: orderData.customers?.full_name || customer_name || "Walk-in",
          customer_phone: orderData.customers?.phone_number || customer_phone,
        };

        const html = buildInvoiceHtml(orderForPdf, orderData.order_items || []);
        const pdfBytes = await generatePdfFromHtml(html);
        pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
        pdfFilename = `invoice_${orderData.order_number}.pdf`;
      }
    }

    // ─── Build template message ───
    const total = Number(total_amount || 0).toFixed(3);
    const orderNum = order_number || "N/A";

    const components: any[] = [];

    // Add document header component if PDF is available
    if (pdfBase64) {
      components.push({
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              filename: pdfFilename,
              // Send as base64 inline
            },
          },
        ],
      });
    }

    // Body parameters: {{1}} = order_number, {{2}} = total_amount
    components.push({
      type: "body",
      parameters: [
        { type: "text", text: orderNum },
        { type: "text", text: `OMR ${total}` },
      ],
    });

    const requestBody: any = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: template_name,
        language: { code: template_language },
        components,
      },
    };

    // If we have PDF, we need to first upload it as media, then reference it
    let mediaId: string | null = null;
    if (pdfBase64) {
      // Upload PDF as media to WhatsApp
      const pdfBuffer = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const formData = new FormData();
      formData.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), pdfFilename);
      formData.append("messaging_product", "whatsapp");
      formData.append("type", "application/pdf");

      const mediaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/media`;
      const mediaResponse = await fetch(mediaUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
        body: formData,
      });

      const mediaData = await mediaResponse.json();
      console.log("Media upload response:", JSON.stringify(mediaData, null, 2));

      if (mediaResponse.ok && mediaData.id) {
        mediaId = mediaData.id;
        // Update header component with media ID
        const headerComp = requestBody.template.components.find((c: any) => c.type === "header");
        if (headerComp) {
          headerComp.parameters[0].document.id = mediaId;
        }
      } else {
        console.error("Media upload failed:", mediaData);
        // Continue without PDF - remove header component
        requestBody.template.components = requestBody.template.components.filter(
          (c: any) => c.type !== "header"
        );
      }
    }

    const messageDescription = `Template: ${template_name} | To: ${normalizedPhone} | Order: ${orderNum} | Total: OMR ${total} | PDF: ${mediaId ? "attached" : "none"}`;
    console.log("Sending WhatsApp:", messageDescription);

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
      } as any);

      if (order_id) {
        await supabase.from("orders").update({ ready_pickup_whatsapp_sent: true }).eq("id", order_id);
      }

      const isTokenError = errorCode === 190 || errorMsg?.toLowerCase().includes("token");

      return new Response(
        JSON.stringify({ success: false, status: "failed", error: errorMsg, is_token_error: isTokenError, provider_response: waData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = waData?.messages?.[0]?.id || null;

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
    } as any);

    if (order_id) {
      await supabase.from("orders").update({ ready_pickup_whatsapp_sent: true }).eq("id", order_id);
    }

    return new Response(
      JSON.stringify({ success: true, status: "sent", message_id: messageId, has_pdf: !!mediaId }),
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
