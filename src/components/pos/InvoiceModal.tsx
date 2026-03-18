import { QRCodeSVG } from "qrcode.react";
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Print area */}
        <div className="invoice-print p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold">Wash & Go Laundry</h1>
            <p className="text-sm text-muted-foreground">Invoice</p>
          </div>

          <div className="h-px bg-border" />

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Order #</p>
              <p className="font-medium">{orderNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{orderDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{customerName || "Walk-in"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{customerPhone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Delivery</p>
              <p className="font-medium">{deliveryDate || "—"}</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                <th className="pb-2">Item</th>
                <th className="pb-2">Service</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="py-2">{item.itemType || "—"}</td>
                  <td className="py-2">{item.serviceId}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatOMR(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="h-px bg-border" />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatOMR(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatOMR(paidAmount)}</span>
            </div>
            {remainingBalance > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Remaining</span>
                <span>{formatOMR(remainingBalance)}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center pt-2">
            <QRCodeSVG value={`ORDER:${orderNumber}`} size={80} />
          </div>
          <p className="text-center text-xs text-muted-foreground">Thank you for your business!</p>
        </div>

        {/* Actions (non-print) */}
        <div className="flex gap-2 p-4 border-t border-border">
          <button onClick={handlePrint} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Print
          </button>
          <button onClick={onClose} className="flex-1 h-10 rounded-md bg-background border border-border text-sm font-medium hover:bg-secondary transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
