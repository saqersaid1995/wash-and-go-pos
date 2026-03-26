import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { searchOrderByCode, updateOrderStatus } from "@/lib/supabase-queries";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ScanBarcode, AlertCircle, CreditCard, Banknote, Building,
  Shuffle, CheckCircle2, PackageCheck, Clock, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { formatOMR } from "@/lib/currency";
import type { WorkflowOrder } from "@/types/workflow";

interface ScanOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill scanned code and auto-search on open */
  initialCode?: string;
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank-transfer", label: "Transfer", icon: Building },
  { id: "mixed", label: "Mixed", icon: Shuffle },
] as const;

type ModalView = "scan" | "payment" | "already-delivered" | "not-ready" | "already-paid";

export default function ScanOrderModal({ open, onOpenChange, initialCode }: ScanOrderModalProps) {
  const [value, setValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ModalView>("scan");
  const [order, setOrder] = useState<WorkflowOrder | null>(null);

  // Payment state
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const resetToScan = useCallback(() => {
    setValue("");
    setError(null);
    setView("scan");
    setOrder(null);
    setAmount("");
    setMethod("cash");
    setSubmitting(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (open) {
      resetToScan();
      // Auto-search if opened with a pre-scanned code
      if (initialCode) {
        setValue(initialCode);
        setTimeout(() => handleSearch(initialCode), 50);
      }
    }
  }, [open, resetToScan, initialCode, handleSearch]);

  const handleSearch = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (trimmed.length < 3) { setError("Invalid barcode format"); return; }

    setSearching(true);
    setError(null);

    try {
      const found = await searchOrderByCode(trimmed);
      if (!found) {
        setError("Order not found");
        setValue("");
        setTimeout(() => inputRef.current?.focus(), 50);
        setSearching(false);
        return;
      }

      setOrder(found);

      if (found.currentStatus === "delivered") {
        setView("already-delivered");
      } else if (found.currentStatus !== "ready-for-pickup" && found.currentStatus !== "received") {
        setView("not-ready");
      } else if (found.remainingBalance > 0) {
        setAmount(found.remainingBalance.toFixed(3));
        setView("payment");
      } else if (found.remainingBalance <= 0 && found.currentStatus === "ready-for-pickup") {
        setView("already-paid");
      } else {
        setAmount(found.remainingBalance.toFixed(3));
        setView("payment");
      }
    } catch {
      setError("Search failed. Please try again.");
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleSearch(value); }
  };

  const handlePayment = async () => {
    if (!order) return;
    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount <= 0 || numericAmount > order.remainingBalance) return;

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
    const newRemaining = Math.max(0, order.totalAmount - newPaid);
    const newPaymentStatus = newRemaining <= 0 ? "paid" : "partially-paid";

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        payment_status: newPaymentStatus,
      })
      .eq("id", order.id);

    if (updateError) {
      toast.error("Order update failed: " + updateError.message);
      setSubmitting(false);
      return;
    }

    // Auto-deliver if fully paid and ready-for-pickup
    if (newRemaining <= 0 && order.currentStatus === "ready-for-pickup") {
      await updateOrderStatus(order.id, "ready-for-pickup", "delivered");
      toast.success(`Payment collected & order ${order.orderNumber} delivered!`);
    } else {
      toast.success(`Payment of ${formatOMR(numericAmount)} recorded for ${order.orderNumber}`);
    }

    setSubmitting(false);
    resetToScan();
  };

  const handleMarkDelivered = async () => {
    if (!order) return;
    setSubmitting(true);
    await updateOrderStatus(order.id, order.currentStatus, "delivered");
    toast.success(`Order ${order.orderNumber} marked as delivered!`);
    setSubmitting(false);
    resetToScan();
  };

  const numericAmount = parseFloat(amount) || 0;
  const isValidPayment = order && numericAmount > 0 && numericAmount <= order.remainingBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-primary" />
            Scan & Pay
          </DialogTitle>
          <DialogDescription>
            {view === "scan" ? "Scan a barcode to process pickup payment." : `Order ${order?.orderNumber || ""}`}
          </DialogDescription>
        </DialogHeader>

        {/* ── SCAN VIEW ── */}
        {view === "scan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              {searching ? (
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <ScanBarcode className="h-8 w-8 text-primary animate-pulse mx-auto" />
                  <p className="text-sm text-muted-foreground">Waiting for barcode scan...</p>
                </div>
              )}
            </div>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. ORD-260324-6892"
              className="text-center text-lg font-mono tracking-wider"
              autoComplete="off"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 text-destructive text-sm justify-center">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
            <Button className="w-full" disabled={!value.trim() || searching} onClick={() => handleSearch(value)}>
              Search Order
            </Button>
          </div>
        )}

        {/* ── PAYMENT VIEW ── */}
        {view === "payment" && order && (
          <div className="space-y-4">
            {/* Order summary */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
              <InfoRow label="Order" value={order.orderNumber} />
              <InfoRow label="Customer" value={order.customerName} />
              <InfoRow label="Phone" value={order.customerPhone || "—"} />
              <InfoRow label="Status" value={order.currentStatus === "ready-for-pickup" ? "Ready for Pickup" : "Received"} icon={order.currentStatus === "ready-for-pickup" ? <PackageCheck className="h-3.5 w-3.5 text-primary" /> : <Clock className="h-3.5 w-3.5 text-warning" />} />
              <InfoRow label="Items" value={String(order.itemCount)} />
              <Separator className="my-2" />
              <InfoRow label="Total" value={formatOMR(order.totalAmount)} />
              <InfoRow label="Paid" value={formatOMR(order.paidAmount)} />
              <div className="flex justify-between font-semibold text-destructive">
                <span>Remaining</span>
                <span>{formatOMR(order.remainingBalance)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon;
                const active = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {pm.label}
                  </button>
                );
              })}
            </div>

            {/* Amount */}
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

            {/* Action */}
            <Button
              className="w-full h-11 text-sm font-semibold gap-2"
              disabled={!isValidPayment || submitting}
              onClick={handlePayment}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {numericAmount >= order.remainingBalance && order.currentStatus === "ready-for-pickup"
                ? `Collect & Deliver — ${formatOMR(numericAmount)}`
                : `Collect Payment — ${formatOMR(numericAmount)}`}
            </Button>

            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetToScan}>
              ← Scan another order
            </Button>
          </div>
        )}

        {/* ── ALREADY PAID (ready for pickup, balance = 0) ── */}
        {view === "already-paid" && order && (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
              <InfoRow label="Order" value={order.orderNumber} />
              <InfoRow label="Customer" value={order.customerName} />
              <InfoRow label="Status" value="Ready for Pickup" icon={<PackageCheck className="h-3.5 w-3.5 text-primary" />} />
              <InfoRow label="Total" value={formatOMR(order.totalAmount)} />
              <div className="flex justify-between font-semibold text-primary">
                <span>Fully Paid</span>
                <span><CheckCircle2 className="h-4 w-4 inline" /></span>
              </div>
            </div>
            <Button className="w-full h-11 gap-2" disabled={submitting} onClick={handleMarkDelivered}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              Mark Delivered
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetToScan}>
              ← Scan another order
            </Button>
          </div>
        )}

        {/* ── ALREADY DELIVERED ── */}
        {view === "already-delivered" && order && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="font-medium">This order has already been delivered</p>
            <p className="text-sm text-muted-foreground">{order.orderNumber} • {order.customerName}</p>
            <Button variant="outline" className="w-full" onClick={resetToScan}>
              Scan Another Order
            </Button>
          </div>
        )}

        {/* ── NOT READY ── */}
        {view === "not-ready" && order && (
          <div className="space-y-4 text-center py-4">
            <Clock className="h-10 w-10 text-warning mx-auto" />
            <p className="font-medium">This order is not ready for pickup yet</p>
            <p className="text-sm text-muted-foreground">{order.orderNumber} • Status: {order.currentStatus}</p>
            <Button variant="outline" className="w-full" onClick={resetToScan}>
              Scan Another Order
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1">{icon}{value}</span>
    </div>
  );
}
