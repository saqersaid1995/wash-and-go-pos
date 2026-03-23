import { QRCodeSVG } from "qrcode.react";
import { useCallback, useRef } from "react";
import type { OrderItem } from "@/types/pos";
import { formatOMR } from "@/lib/currency";
import { BUSINESS } from "@/lib/business-config";

interface Props {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  items: OrderItem[];
  total: number;
  paidAmount: number;
  remainingBalance: number;
  onClose: () => void;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buildReceiptHtml({
  orderNumber,
  customerName,
  customerPhone,
  orderDate,
  deliveryDate,
  items,
  total,
  paidAmount,
  remainingBalance,
  logoUrl,
  qrMarkup,
}: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  items: OrderItem[];
  total: number;
  paidAmount: number;
  remainingBalance: number;
  logoUrl: string;
  qrMarkup: string;
}) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.itemType || "—")}</td>
          <td>${escapeHtml(item.serviceId || "—")}</td>
          <td class="c">${item.quantity}</td>
          <td class="r">${escapeHtml(formatOMR(item.unitPrice * item.quantity))}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt</title>
  <style>
    @page {
      size: 80mm 210mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background: #fff;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt {
      width: 72mm;
      margin: 6mm auto 0;
      font-size: 11px;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-align: center;
      margin-bottom: 4px;
    }

    .header img {
      width: 28px;
      height: 28px;
      object-fit: contain;
      flex: none;
    }

    .header h1 {
      margin: 0;
      font-size: 13px;
      line-height: 1.1;
      font-weight: 700;
    }

    .tagline {
      margin: 1px 0 0;
      font-size: 9px;
      color: #666;
    }

    .divider {
      border: 0;
      border-top: 1px solid #d8d8d8;
      margin: 4px 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 8px;
      font-size: 10px;
    }

    .info-grid .full {
      grid-column: 1 / -1;
    }

    .label {
      color: #666;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 10px;
    }

    th {
      padding: 0 0 2px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #666;
    }

    td {
      padding: 2px 0;
      border-top: 1px solid #ededed;
      vertical-align: top;
    }

    .c {
      text-align: center;
    }

    .r {
      text-align: right;
    }

    .totals {
      display: grid;
      gap: 2px;
      margin-top: 2px;
      font-size: 11px;
    }

    .totals-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .totals-row.total {
      font-size: 13px;
      font-weight: 700;
    }

    .totals-row.remaining {
      color: #c1121f;
    }

    .qr {
      display: flex;
      justify-content: center;
      padding: 5px 0 3px;
    }

    .qr svg {
      width: 55px;
      height: 55px;
      display: block;
    }

    .footer {
      text-align: center;
      font-size: 9px;
      color: #666;
      margin: 0;
    }
  </style>
</head>
<body>
  <article class="receipt">
    <div class="header">
      <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(BUSINESS.name)}" />
      <div>
        <h1>${escapeHtml(BUSINESS.name)}</h1>
        <p class="tagline">${escapeHtml(BUSINESS.tagline)}</p>
      </div>
    </div>

    <hr class="divider" />

    <div class="info-grid">
      <div><span class="label">Order: </span><strong>${escapeHtml(orderNumber)}</strong></div>
      <div><span class="label">Date: </span><strong>${escapeHtml(orderDate)}</strong></div>
      <div><span class="label">Customer: </span><strong>${escapeHtml(customerName || "Walk-in")}</strong></div>
      <div><span class="label">Phone: </span><strong>${escapeHtml(customerPhone || "—")}</strong></div>
      ${deliveryDate ? `<div class="full"><span class="label">Delivery: </span><strong>${escapeHtml(deliveryDate)}</strong></div>` : ""}
    </div>

    <hr class="divider" />

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Service</th>
          <th class="c">Qty</th>
          <th class="r">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <hr class="divider" />

    <div class="totals">
      <div class="totals-row total">
        <span>Total</span>
        <span>${escapeHtml(formatOMR(total))}</span>
      </div>
      <div class="totals-row">
        <span class="label">Paid</span>
        <span>${escapeHtml(formatOMR(paidAmount))}</span>
      </div>
      ${remainingBalance > 0 ? `<div class="totals-row remaining"><span>Remaining</span><span>${escapeHtml(formatOMR(remainingBalance))}</span></div>` : ""}
    </div>

    <div class="qr">${qrMarkup}</div>
    <p class="footer">Thank you for your business!</p>
  </article>
</body>
</html>`;
}

export default function InvoiceModal(props: Props) {
  const { orderNumber, customerName, customerPhone, orderDate, deliveryDate, items, total, paidAmount, remainingBalance, onClose } = props;
  const printTriggered = useRef(false);

  const handlePrint = useCallback(() => {
    if (printTriggered.current) return;
    printTriggered.current = true;

    const qrSvg = document.querySelector(".invoice-qr-source svg");
    const qrMarkup = qrSvg ? new XMLSerializer().serializeToString(qrSvg) : "";
    const logoUrl = new URL(BUSINESS.logo, window.location.origin).toString();
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      printTriggered.current = false;
      return;
    }

    const releasePrintLock = () => {
      printTriggered.current = false;
    };

    const receiptHtml = buildReceiptHtml({
      orderNumber,
      customerName,
      customerPhone,
      orderDate,
      deliveryDate,
      items,
      total,
      paidAmount,
      remainingBalance,
      logoUrl,
      qrMarkup,
    });

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();

    const resetTimer = window.setTimeout(() => {
      releasePrintLock();
    }, 10000);

    printWindow.onafterprint = () => {
      window.clearTimeout(resetTimer);
      releasePrintLock();
      printWindow.close();
    };

    printWindow.onload = async () => {
      const images = Array.from(printWindow.document.images);
      await Promise.all(
        images.map(
          (image) =>
            image.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  image.addEventListener("load", () => resolve(), { once: true });
                  image.addEventListener("error", () => resolve(), { once: true });
                })
        )
      );

      printWindow.focus();
      printWindow.print();
    };
  }, [customerName, customerPhone, deliveryDate, items, orderDate, orderNumber, paidAmount, remainingBalance, total]);

  return (
    <>
      <div className="invoice-qr-source" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <QRCodeSVG value={`ORDER:${orderNumber}`} size={55} />
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40">
        <div className="bg-card rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] overflow-auto">
          <div className="p-4 space-y-3" style={{ maxWidth: "80mm", margin: "0 auto" }}>
            <div className="flex items-center gap-2 justify-center">
              <img src={BUSINESS.logo} alt={BUSINESS.name} className="h-10 w-10 object-contain" />
              <div className="text-center">
                <h1 className="text-base font-bold tracking-tight leading-tight">{BUSINESS.name}</h1>
                <p className="text-[10px] text-muted-foreground">{BUSINESS.tagline}</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div><span className="text-muted-foreground">Order: </span><span className="font-medium">{orderNumber}</span></div>
              <div><span className="text-muted-foreground">Date: </span><span className="font-medium">{orderDate}</span></div>
              <div><span className="text-muted-foreground">Customer: </span><span className="font-medium">{customerName || "Walk-in"}</span></div>
              <div><span className="text-muted-foreground">Phone: </span><span className="font-medium">{customerPhone || "—"}</span></div>
              {deliveryDate && (
                <div className="col-span-2"><span className="text-muted-foreground">Delivery: </span><span className="font-medium">{deliveryDate}</span></div>
              )}
            </div>
            <div className="h-px bg-border" />
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="pb-1">Item</th>
                  <th className="pb-1">Service</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-1">{item.itemType || "—"}</td>
                    <td className="py-1">{item.serviceId}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{formatOMR(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="h-px bg-border" />
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between font-bold text-sm">
                <span>Total</span><span>{formatOMR(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span><span>{formatOMR(paidAmount)}</span>
              </div>
              {remainingBalance > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Remaining</span><span>{formatOMR(remainingBalance)}</span>
                </div>
              )}
            </div>
            <div className="qr-section flex justify-center pt-1">
              <QRCodeSVG value={`ORDER:${orderNumber}`} size={60} />
            </div>
            <p className="text-center text-[10px] text-muted-foreground pb-1">Thank you for your business!</p>
          </div>
          <div className="flex gap-2 p-3 border-t border-border">
            <button onClick={handlePrint} className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Print
            </button>
            <button onClick={onClose} className="flex-1 h-9 rounded-md bg-background border border-border text-sm font-medium hover:bg-secondary transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
