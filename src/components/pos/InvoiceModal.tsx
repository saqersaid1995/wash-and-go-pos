import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
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

  const handlePrint = () => {
    if (printTriggered.current) return;
    printTriggered.current = true;
    window.print();
    // Reset after print dialog closes
    setTimeout(() => {
      printTriggered.current = false;
    }, 1000);
  };

  return (
    <>
      {/* PRINT-ONLY receipt — rendered outside the modal so print CSS can find it */}
      <div className="invoice-print hidden print:!block p-4 space-y-3">
        <div className="flex items-center gap-2 justify-center">
          <img src={BUSINESS.logo} alt={BUSINESS.name} className="h-8 w-8 object-contain" />
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

      {/* SCREEN-ONLY modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 print:!hidden">
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
