import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, Building, Shuffle, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatOMR } from "@/lib/currency";
import type { WorkflowOrder } from "@/types/workflow";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank-transfer", label: "Bank Transfer", icon: Building },
  { id: "mixed", label: "Mixed", icon: Shuffle },
] as const;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkflowOrder;
  onPaymentComplete: () => void;
}

export default function PaymentModal({ open, onOpenChange, order, onPaymentComplete }: PaymentModalProps) {
  const [amount, setAmount] = useState(String(order.remainingBalance.toFixed(3)));
  const [method, setMethod] = useState<string>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ amount: number; method: string; date: string } | null>(null);

  const numericAmount = parseFloat(amount) || 0;
  const isValid = numericAmount > 0 && numericAmount <= order.remainingBalance;

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);

    const { error: payError } = await supabase.from("payments").insert({
      order_id: order.id,
      payment_method: method,
      amount: numericAmount,
    });

    if (payError) {
      toast.error("Payment failed: " + payError.message);
      setSubmitting(false);
      return;
    }

    const newPaid = order.paidAmount + numericAmount;
    const newRemaining = order.totalAmount - newPaid;
    const newPaymentStatus = newRemaining <= 0 ? "paid" : "partially-paid";

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        paid_amount: newPaid,
        remaining_amount: Math.max(0, newRemaining),
        payment_status: newPaymentStatus,
      })
      .eq("id", order.id);

    if (updateError) {
      toast.error("Order update failed: " + updateError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setReceipt({ amount: numericAmount, method, date: new Date().toLocaleString() });
    toast.success("Payment recorded successfully");
    onPaymentComplete();
  };

  const handleClose = () => {
    setReceipt(null);
    setAmount(String(order.remainingBalance.toFixed(3)));
    setMethod("cash");
    onOpenChange(false);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setAmount(String(order.remainingBalance.toFixed(3)));
      setMethod("cash");
      setReceipt(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Pickup Payment
          </DialogTitle>
          <DialogDescription>Collect payment before delivering the order.</DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4 space-y-3 text-sm receipt-print">
              <h4 className="font-bold text-center">Payment Receipt</h4>
              <Separator />
              <InfoRow label="Order" value={order.orderNumber} />
              <InfoRow label="Customer" value={order.customerName} />
              <InfoRow label="Amount Paid" value={formatOMR(receipt.amount)} />
              <InfoRow label="Method" value={receipt.method} />
              <InfoRow label="Date" value={receipt.date} />
              <Separator />
              <p className="text-center text-xs text-muted-foreground">Thank you!</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handlePrintReceipt}>
                <Printer className="h-3.5 w-3.5" /> Print Receipt
              </Button>
              <Button size="sm" className="flex-1" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
              <InfoRow label="Order" value={order.orderNumber} />
              <InfoRow label="Customer" value={order.customerName} />
              <Separator className="my-2" />
              <InfoRow label="Total" value={formatOMR(order.totalAmount)} />
              <InfoRow label="Paid" value={formatOMR(order.paidAmount)} />
              <div className="flex justify-between font-semibold text-destructive">
                <span>Remaining</span>
                <span>{formatOMR(order.remainingBalance)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  const isActive = method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setMethod(pm.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">OMR</span>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={order.remainingBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 text-lg font-semibold"
                />
              </div>
              {numericAmount > order.remainingBalance && (
                <p className="text-xs text-destructive">Amount exceeds remaining balance</p>
              )}
              {numericAmount > 0 && numericAmount < order.remainingBalance && (
                <p className="text-xs text-warning">Partial payment — balance will remain</p>
              )}
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold gap-2"
              disabled={!isValid || submitting}
              onClick={handleConfirm}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Confirm Payment — {formatOMR(numericAmount)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
