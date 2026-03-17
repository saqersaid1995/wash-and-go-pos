import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Building, Shuffle, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WorkflowOrder } from "@/types/workflow";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank-transfer", label: "Bank Transfer", icon: Building },
  { id: "mixed", label: "Mixed", icon: Shuffle },
] as const;

interface MultiOrderCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: WorkflowOrder[];
  customerName: string;
  customerPhone: string;
  onPaymentComplete: () => void;
}

export default function MultiOrderCheckoutModal({
  open, onOpenChange, orders, customerName, customerPhone, onPaymentComplete,
}: MultiOrderCheckoutModalProps) {
  const combinedRemaining = orders.reduce((s, o) => s + o.remainingBalance, 0);
  const combinedTotal = orders.reduce((s, o) => s + o.totalAmount, 0);
  const combinedPaid = orders.reduce((s, o) => s + o.paidAmount, 0);

  const [amount, setAmount] = useState(combinedRemaining.toFixed(2));
  const [method, setMethod] = useState<string>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ amount: number; method: string; date: string } | null>(null);

  const numericAmount = parseFloat(amount) || 0;
  const isValid = numericAmount > 0 && numericAmount <= combinedRemaining;

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);

    let remaining = numericAmount;

    for (const order of orders) {
      if (remaining <= 0) break;
      const payForThis = Math.min(remaining, order.remainingBalance);
      if (payForThis <= 0) continue;

      // Insert payment
      const { error: payError } = await supabase.from("payments").insert({
        order_id: order.id,
        payment_method: method,
        amount: payForThis,
      });

      if (payError) {
        toast.error(`Payment failed for ${order.orderNumber}: ${payError.message}`);
        setSubmitting(false);
        return;
      }

      // Update order
      const newPaid = order.paidAmount + payForThis;
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
        toast.error(`Order update failed for ${order.orderNumber}: ${updateError.message}`);
        setSubmitting(false);
        return;
      }

      remaining -= payForThis;
    }

    setSubmitting(false);
    setReceipt({ amount: numericAmount, method, date: new Date().toLocaleString() });
    toast.success("Payment recorded for selected orders");
    onPaymentComplete();
  };

  const handleClose = () => {
    setReceipt(null);
    setAmount(combinedRemaining.toFixed(2));
    setMethod("cash");
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setAmount(combinedRemaining.toFixed(2));
      setMethod("cash");
      setReceipt(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Pickup Checkout
          </DialogTitle>
          <DialogDescription>Collect payment for {orders.length} selected order{orders.length !== 1 ? "s" : ""}.</DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4 space-y-3 text-sm receipt-print">
              <h4 className="font-bold text-center">Payment Receipt</h4>
              <Separator />
              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Phone" value={customerPhone} />
              <InfoRow label="Orders" value={orders.map(o => o.orderNumber).join(", ")} />
              <InfoRow label="Amount Paid" value={`$${receipt.amount.toFixed(2)}`} />
              <InfoRow label="Method" value={receipt.method} />
              <InfoRow label="Date" value={receipt.date} />
              <Separator />
              <p className="text-center text-xs text-muted-foreground">Thank you!</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print Receipt
              </Button>
              <Button size="sm" className="flex-1" onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer & orders summary */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm">
              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Phone" value={customerPhone} />
              <Separator className="my-2" />
              {orders.map(o => (
                <div key={o.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="text-destructive font-semibold">${o.remainingBalance.toFixed(2)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <InfoRow label="Combined Total" value={`$${combinedTotal.toFixed(2)}`} />
              <InfoRow label="Combined Paid" value={`$${combinedPaid.toFixed(2)}`} />
              <div className="flex justify-between font-semibold text-destructive">
                <span>Combined Remaining</span>
                <span>${combinedRemaining.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
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

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={combinedRemaining}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 text-lg font-semibold"
                />
              </div>
              {numericAmount > combinedRemaining && (
                <p className="text-xs text-destructive">Amount exceeds combined remaining balance</p>
              )}
              {numericAmount > 0 && numericAmount < combinedRemaining && (
                <p className="text-xs text-warning">Partial payment — orders cannot be marked delivered until fully paid.</p>
              )}
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold gap-2"
              disabled={!isValid || submitting}
              onClick={handleConfirm}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Confirm Payment — ${numericAmount.toFixed(2)}
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
