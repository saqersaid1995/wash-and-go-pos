import { QRCodeSVG } from "qrcode.react";
import { useRef, useCallback } from "react";
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

export default function InvoiceModal(props: Props) {
  const { orderNumber, customerName, customerPhone, orderDate, deliveryDate, items, total, paidAmount, remainingBalance, onClose } = props;
  const printTriggered = useRef(false);

  const handlePrint = useCallback(() => {
    if (printTriggered.current) return;
    printTriggered.current = true;

    // Build receipt HTML and print in a new window to completely isolate from the app DOM
    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 80mm;
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    padding: 3mm;
  }
  .center { text-align: center; }
  .header { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px; }
  .header img { width: 28px; height: 28px; object-fit: contain; }
  .header h1 { font-size: 13px; font-weight: 700; margin: 0; line-height: 1.1; }
  .header .tagline { font-size: 9px; color: #666; margin: 0; }
  .divider { border: none; border-top: 1px solid #ccc; margin: 4px 0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 10px; margin: 4px 0; }
  .info-grid .label { color: #666; }
  .info-grid .full { grid-column: 1 / -1; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; color: #666; padding-bottom: 2px; letter-spacing: 0.5px; }
  th.r, td.r { text-align: right; }
  th.c, td.c { text-align: center; }
  td { padding: 2px 0; border-top: 1px solid #eee; }
  .totals { margin: 4px 0; font-size: 11px; }
  .totals .row { display: flex; justify-content: space-between; }
  .totals .total-row { font-weight: 700; font-size: 13px; }
  .totals .label { color: #666; }
  .totals .remaining { color: #c00; }
  .qr { text-align: center; padding: 4px 0; }
  .qr svg { width: 55px; height: 55px; }
  .footer { text-align: center; font-size: 9px; color: #666; padding-bottom: 2px; }
</style>
</head>
<body>
  <div class="header">
    <img src="${BUSINESS.logo}" alt="${BUSINESS.name}" />
    <div>
      <h1>${BUSINESS.name}</h1>
      <p class="tagline">${BUSINESS.tagline}</p>
    </div>
  </div>
  <hr class="divider" />
  <div class="info-grid">
    <div><span class="label">Order: </span><strong>${orderNumber}</strong></div>
    <div><span class="label">Date: </span><strong>${orderDate}</strong></div>
    <div><span class="label">Customer: </span><strong>${customerName || "Walk-in"}</strong></div>
    <div><span class="label">Phone: </span><strong>${customerPhone || "—"}</strong></div>
    ${deliveryDate ? `<div class="full"><span class="label">Delivery: </span><strong>${deliveryDate}</strong></div>` : ""}
  </div>
  <hr class="divider" />
  <table>
    <thead><tr><th>Item</th><th>Service</th><th class="c">Qty</th><th class="r">Total</th></tr></thead>
    <tbody>
      ${items.map(item => `<tr><td>${item.itemType || "—"}</td><td>${item.serviceId}</td><td class="c">${item.quantity}</td><td class="r">${formatOMR(item.unitPrice * item.quantity)}</td></tr>`).join("")}
    </tbody>
  </table>
  <hr class="divider" />
  <div class="totals">
    <div class="row total-row"><span>Total</span><span>${formatOMR(total)}</span></div>
    <div class="row"><span class="label">Paid</span><span>${formatOMR(paidAmount)}</span></div>
    ${remainingBalance > 0 ? `<div class="row remaining"><span>Remaining</span><span>${formatOMR(remainingBalance)}</span></div>` : ""}
  </div>
  <div class="qr" id="qr-placeholder"></div>
  <p class="footer">Thank you for your business!</p>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) {
      printTriggered.current = false;
      return;
    }
    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Render QR code into the print window
    const qrContainer = printWindow.document.getElementById("qr-placeholder");
    if (qrContainer) {
      const svgNS = "http://www.w3.org/2000/svg";
      // Use a simple text placeholder for QR - we'll inject from the main document
      const qrSvg = document.querySelector(".invoice-qr-source svg");
      if (qrSvg) {
        qrContainer.innerHTML = qrSvg.outerHTML;
      }
    }

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        printTriggered.current = false;
      }, 300);
    };
    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (printTriggered.current) {
        try {
          printWindow.print();
          printWindow.close();
        } catch (_) {}
        printTriggered.current = false;
      }
    }, 2000);
  }, [orderNumber, customerName, customerPhone, orderDate, deliveryDate, items, total, paidAmount, remainingBalance]);

  return (
    <>
      {/* Hidden QR source for copying into print window */}
      <div className="invoice-qr-source" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <QRCodeSVG value={`ORDER:${orderNumber}`} size={55} />
      </div>

      {/* SCREEN-ONLY modal */}
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
