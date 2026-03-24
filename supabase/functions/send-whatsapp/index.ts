import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, grayscale } from "https://esm.sh/pdf-lib@1.17.1";

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

function fmtOMR(amount: number): string {
  return `OMR ${Math.abs(amount).toFixed(3)}`;
}

// ─── Branded PDF generation using pdf-lib ───

async function generateBrandedPdf(
  order: any,
  items: any[],
  logoUrl?: string | null
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  // Receipt-style page: 80mm x 210mm → points (1mm ≈ 2.835pt)
  const W = 226.8; // 80mm
  const H = 595.3; // 210mm
  const page = pdf.addPage([W, H]);

  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);
  const red = rgb(0.757, 0.071, 0.122); // #c1121f
  const lineGray = grayscale(0.85);

  const LM = 14; // left margin
  const RM = W - 14; // right margin
  const CW = RM - LM; // content width
  let y = H - 20;

  // Helper: draw horizontal divider
  const divider = () => {
    page.drawLine({ start: { x: LM, y }, end: { x: RM, y }, thickness: 0.5, color: lineGray });
    y -= 8;
  };

  // Helper: draw text right-aligned
  const drawRight = (text: string, yPos: number, font = fontRegular, size = 8, color = black) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: RM - tw, y: yPos, size, font, color });
  };

  // Helper: safe text (replace non-Latin chars that Helvetica can't render with ?)
  const safe = (text: string) => {
    // Helvetica supports Latin-1 (code points 0-255). Replace others.
    return text.replace(/[^\x00-\xFF]/g, (ch) => {
      // Try to keep basic Arabic numerals mapped
      return "?";
    });
  };

  // ─── Logo + Header ───
  let logoImage: any = null;
  if (logoUrl) {
    try {
      const logoResp = await fetch(logoUrl);
      if (logoResp.ok) {
        const logoBytes = new Uint8Array(await logoResp.arrayBuffer());
        const ct = logoResp.headers.get("content-type") || "";
        if (ct.includes("png")) {
          logoImage = await pdf.embedPng(logoBytes);
        } else {
          logoImage = await pdf.embedJpg(logoBytes);
        }
      }
    } catch (e) {
      console.error("Logo embed failed:", e);
    }
  }

  if (logoImage) {
    const logoSize = 22;
    const logoX = (W - logoSize - fontBold.widthOfTextAtSize("LAVANDERIA", 11) - 6) / 2;
    page.drawImage(logoImage, { x: logoX, y: y - logoSize + 4, width: logoSize, height: logoSize });
    page.drawText("LAVANDERIA", {
      x: logoX + logoSize + 6,
      y: y - 8,
      size: 11,
      font: fontBold,
      color: black,
    });
    page.drawText("Professional Laundry Services", {
      x: logoX + logoSize + 6,
      y: y - 18,
      size: 7,
      font: fontRegular,
      color: gray,
    });
  } else {
    // No logo — center text
    const titleW = fontBold.widthOfTextAtSize("LAVANDERIA", 11);
    page.drawText("LAVANDERIA", { x: (W - titleW) / 2, y: y - 8, size: 11, font: fontBold, color: black });
    const tagW = fontRegular.widthOfTextAtSize("Professional Laundry Services", 7);
    page.drawText("Professional Laundry Services", { x: (W - tagW) / 2, y: y - 18, size: 7, font: fontRegular, color: gray });
  }

  y -= 28;
  divider();

  // ─── Phone row (large) ───
  const phone = safe(order.customer_phone || "—");
  const phoneLabelW = fontRegular.widthOfTextAtSize("Phone: ", 7);
  const phoneW = fontBold.widthOfTextAtSize(phone, 16);
  const phoneBlockW = phoneLabelW + phoneW;
  const phoneX = (W - phoneBlockW) / 2;
  page.drawText("Phone: ", { x: phoneX, y: y - 4, size: 7, font: fontRegular, color: gray });
  page.drawText(phone, { x: phoneX + phoneLabelW, y: y - 8, size: 16, font: fontBold, color: black });
  y -= 22;
  divider();

  // ─── Info grid ───
  const infoSize = 8;
  const labelSize = 7;

  const drawInfoRow = (label: string, value: string, x: number, yPos: number) => {
    page.drawText(label, { x, y: yPos, size: labelSize, font: fontRegular, color: gray });
    const lw = fontRegular.widthOfTextAtSize(label, labelSize);
    page.drawText(safe(value), { x: x + lw, y: yPos, size: infoSize, font: fontBold, color: black });
  };

  const col2X = LM + CW / 2 + 4;
  drawInfoRow("Order: ", order.order_number || "—", LM, y);
  drawInfoRow("Date: ", order.order_date || "—", col2X, y);
  y -= 12;
  drawInfoRow("Customer: ", order.customer_name || "Walk-in", LM, y);
  if (order.delivery_date) {
    drawInfoRow("Delivery: ", order.delivery_date, col2X, y);
  }
  y -= 14;
  divider();

  // ─── Table header ───
  const thSize = 7;
  const tdSize = 8;
  const colItem = LM;
  const colService = LM + CW * 0.3;
  const colQty = LM + CW * 0.6;
  const colTotal = RM;

  page.drawText("ITEM", { x: colItem, y, size: thSize, font: fontRegular, color: gray });
  page.drawText("SERVICE", { x: colService, y, size: thSize, font: fontRegular, color: gray });
  const qtyHdrW = fontRegular.widthOfTextAtSize("QTY", thSize);
  page.drawText("QTY", { x: colQty - qtyHdrW / 2, y, size: thSize, font: fontRegular, color: gray });
  const totalHdrW = fontRegular.widthOfTextAtSize("TOTAL", thSize);
  page.drawText("TOTAL", { x: colTotal - totalHdrW, y, size: thSize, font: fontRegular, color: gray });
  y -= 4;
  page.drawLine({ start: { x: LM, y }, end: { x: RM, y }, thickness: 0.5, color: lineGray });
  y -= 10;

  // ─── Table rows ───
  for (const item of items) {
    if (y < 60) break; // safety
    const itemName = safe(item.item_type || "—");
    const serviceName = safe(item.service_type || "—");
    const qty = String(item.quantity || 1);
    const lineTotal = fmtOMR((Number(item.unit_price) || 0) * (item.quantity || 1));

    page.drawText(itemName.substring(0, 14), { x: colItem, y, size: tdSize, font: fontRegular, color: black });
    page.drawText(serviceName.substring(0, 12), { x: colService, y, size: tdSize, font: fontRegular, color: black });
    const qtyW = fontRegular.widthOfTextAtSize(qty, tdSize);
    page.drawText(qty, { x: colQty - qtyW / 2, y, size: tdSize, font: fontRegular, color: black });
    drawRight(lineTotal, y, fontRegular, tdSize);
    y -= 12;
    page.drawLine({ start: { x: LM, y: y + 4 }, end: { x: RM, y: y + 4 }, thickness: 0.3, color: grayscale(0.93) });
  }

  y -= 4;
  divider();

  // ─── Totals ───
  const totalAmt = Number(order.total_amount || 0);
  const paidAmt = Number(order.paid_amount || 0);
  const remainingAmt = Number(order.remaining_amount || 0);

  page.drawText("Total", { x: LM, y, size: 10, font: fontBold, color: black });
  drawRight(fmtOMR(totalAmt), y, fontBold, 10);
  y -= 13;

  page.drawText("Paid", { x: LM, y, size: 8, font: fontRegular, color: gray });
  drawRight(fmtOMR(paidAmt), y, fontRegular, 8);
  y -= 12;

  if (remainingAmt > 0) {
    page.drawText("Remaining", { x: LM, y, size: 8, font: fontBold, color: red });
    drawRight(fmtOMR(remainingAmt), y, fontBold, 8, red);
    y -= 12;
  }

  y -= 6;

  // ─── Footer ───
  const footerText = "Thank you for your business!";
  const footerW = fontRegular.widthOfTextAtSize(footerText, 7);
  page.drawText(footerText, { x: (W - footerW) / 2, y: Math.max(y, 14), size: 7, font: fontRegular, color: gray });

  return pdf.save();
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

    // ─── Fetch order details and generate branded PDF ───
    let pdfBytes: Uint8Array | null = null;
    let pdfFilename = `invoice_${order_number || "unknown"}.pdf`;

    // Try to get the logo from the published app
    const logoUrl = "https://wash-and-go-pos.lovable.app/assets/lavanderia-logo.jpeg";

    if (order_id) {
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

        pdfBytes = await generateBrandedPdf(orderForPdf, orderData.order_items || [], logoUrl);
        pdfFilename = `invoice_${orderData.order_number}.pdf`;
      }
    }

    // If no order found but we still have basic info, generate a minimal PDF
    if (!pdfBytes) {
      const fallbackOrder = {
        order_number: order_number || "N/A",
        order_date: new Date().toISOString().slice(0, 10),
        customer_name: customer_name || "Walk-in",
        customer_phone: customer_phone || "—",
        delivery_date: null,
        total_amount: total_amount || 0,
        paid_amount: (total_amount || 0) - (remaining_amount || 0),
        remaining_amount: remaining_amount || 0,
      };
      pdfBytes = await generateBrandedPdf(fallbackOrder, [], logoUrl);
    }

    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    // ─── Build template message ───
    const total = Number(total_amount || 0).toFixed(3);
    const orderNum = order_number || "N/A";

    const components: any[] = [];

    // Add document header component
    components.push({
      type: "header",
      parameters: [
        {
          type: "document",
          document: {
            filename: pdfFilename,
          },
        },
      ],
    });

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

    // Upload PDF as media to WhatsApp
    let mediaId: string | null = null;
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
      const headerComp = requestBody.template.components.find((c: any) => c.type === "header");
      if (headerComp) {
        headerComp.parameters[0].document.id = mediaId;
      }
    } else {
      console.error("Media upload failed:", mediaData);
      requestBody.template.components = requestBody.template.components.filter(
        (c: any) => c.type !== "header"
      );
    }

    const messageDescription = `Template: ${template_name} | To: ${normalizedPhone} | Order: ${orderNum} | Total: OMR ${total} | PDF: ${mediaId ? "attached" : "none"}`;
    console.log("Sending WhatsApp:", messageDescription);

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
