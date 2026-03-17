import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard, Truck, FileText, ShoppingBag, AlertTriangle, CheckCircle2,
} from "lucide-react";
import type { WorkflowOrder } from "@/types/workflow";
import { WORKFLOW_STAGES } from "@/types/workflow";
import { updateOrderStatus } from "@/lib/supabase-queries";
import { toast } from "sonner";
import MultiOrderCheckoutModal from "@/components/payment/MultiOrderCheckoutModal";

interface PhoneSearchResultsProps {
  customerName: string;
  customerPhone: string;
  orders: WorkflowOrder[];
  onRefresh: () => void;
}

export default function PhoneSearchResults({
  customerName, customerPhone, orders, onRefresh,
}: PhoneSearchResultsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const filteredOrders = useMemo(() => {
    if (showAll) return orders;
    return orders.filter(
      (o) => o.currentStatus !== "delivered"
    );
  }, [orders, showAll]);

  const selectedOrders = useMemo(
    () => filteredOrders.filter((o) => selectedIds.has(o.id)),
    [filteredOrders, selectedIds]
  );

  const summary = useMemo(() => ({
    count: selectedOrders.length,
    total: selectedOrders.reduce((s, o) => s + o.totalAmount, 0),
    paid: selectedOrders.reduce((s, o) => s + o.paidAmount, 0),
    remaining: selectedOrders.reduce((s, o) => s + o.remainingBalance, 0),
  }), [selectedOrders]);

  const allReadyForPickup = selectedOrders.every((o) => o.currentStatus === "ready-for-pickup");
  const canDeliver = summary.count > 0 && summary.remaining <= 0 && allReadyForPickup;

  const handleDeliverOnly = async () => {
    if (!canDeliver) {
      if (!allReadyForPickup) {
        toast.error("Only Ready for Pickup orders can be delivered.");
      } else {
        toast.error("Selected orders cannot be marked delivered until the remaining balance is fully paid.");
      }
      return;
    }
    setDelivering(true);
    for (const order of selectedOrders) {
      await updateOrderStatus(order.id, order.currentStatus, "delivered");
    }
    setDelivering(false);
    toast.success(`${selectedOrders.length} order(s) successfully delivered.`);
    setSelectedIds(new Set());
    onRefresh();
  };

  const handlePaymentComplete = () => {
    setSelectedIds(new Set());
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {/* Customer header */}
      <div className="pos-section">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">{customerName}</h3>
            <p className="text-sm text-muted-foreground">{customerPhone}</p>
          </div>
          <Badge variant="outline" className="text-xs">{orders.length} order{orders.length !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-1">
        <button onClick={selectAll} className="text-xs text-primary font-medium hover:underline">
          {selectedIds.size === filteredOrders.length && filteredOrders.length > 0 ? "Deselect All" : "Select All"}
        </button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
          Show all orders
        </label>
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {filteredOrders.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No pickup-relevant orders found for this customer.
          </div>
        )}
        {filteredOrders.map((order) => {
          const isSelected = selectedIds.has(order.id);
          const isOverdue = order.deliveryDate < today && order.currentStatus !== "delivered";
          const isDueToday = order.deliveryDate === today;
          const isReady = order.currentStatus === "ready-for-pickup";
          const isDelivered = order.currentStatus === "delivered";
          const stageLabel = WORKFLOW_STAGES.find((s) => s.id === order.currentStatus)?.label || order.currentStatus;

          return (
            <div
              key={order.id}
              className={`pos-section p-3 space-y-2 cursor-pointer transition-colors ${
                isSelected ? "ring-2 ring-primary/50 bg-primary/5" : ""
              } ${isDelivered ? "opacity-60" : ""}`}
              onClick={() => !isDelivered && toggleSelect(order.id)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(order.id)}
                  disabled={isDelivered}
                  className="mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{order.orderNumber}</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <PaymentBadge status={order.paymentStatus} />
                      {isReady && <Badge className="bg-success/15 text-success text-[0.6rem] px-1.5 py-0">Ready</Badge>}
                      {isOverdue && <Badge variant="destructive" className="text-[0.6rem] px-1.5 py-0">Overdue</Badge>}
                      {isDueToday && !isOverdue && <Badge className="bg-warning/15 text-warning text-[0.6rem] px-1.5 py-0">Due Today</Badge>}
                      {isDelivered && <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">Delivered</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 mt-1.5 text-xs text-muted-foreground">
                    <span>Status: <strong className="text-foreground capitalize">{stageLabel}</strong></span>
                    <span>Items: <strong className="text-foreground">{order.itemCount}</strong></span>
                    <span>Total: <strong className="text-foreground">${order.totalAmount.toFixed(2)}</strong></span>
                  </div>
                  {order.remainingBalance > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Balance: ${order.remainingBalance.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-2 pl-7" onClick={(e) => e.stopPropagation()}>
                <Link to={`/order/${order.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-[0.65rem] gap-1 px-2">
                    <FileText className="h-3 w-3" /> Details
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection summary */}
      {summary.count > 0 && (
        <div className="pos-section space-y-3 sticky bottom-0 bg-card border-t border-border shadow-lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoCell label="Selected Orders" value={String(summary.count)} />
            <InfoCell label="Selected Total" value={`$${summary.total.toFixed(2)}`} />
            <InfoCell label="Selected Paid" value={`$${summary.paid.toFixed(2)}`} />
            <InfoCell label="Selected Remaining" value={`$${summary.remaining.toFixed(2)}`} highlight={summary.remaining > 0} />
          </div>

          <div className="flex gap-2">
            {summary.remaining > 0 && (
              <Button
                size="sm"
                className="flex-1 h-10 text-xs gap-1.5 bg-warning hover:bg-warning/90 text-warning-foreground"
                onClick={() => setCheckoutOpen(true)}
              >
                <CreditCard className="h-3.5 w-3.5" /> Collect Payment
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 h-10 text-xs gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleMarkDelivered}
              disabled={!canDeliver || delivering}
              title={!canDeliver ? "Pay remaining balance first" : "Mark all selected as delivered"}
            >
              <Truck className="h-3.5 w-3.5" />
              {delivering ? "Delivering..." : "Mark Delivered"}
            </Button>
          </div>

          {summary.remaining > 0 && (
            <p className="text-[0.65rem] text-destructive text-center">
              ⚠ Selected orders cannot be delivered until the remaining balance is fully paid.
            </p>
          )}
        </div>
      )}

      <MultiOrderCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        orders={selectedOrders}
        customerName={customerName}
        customerPhone={customerPhone}
        onPaymentComplete={onRefresh}
      />
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-semibold text-sm ${highlight ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    paid: { label: "Paid", className: "bg-success/15 text-success border-success/20" },
    "partially-paid": { label: "Partial", className: "bg-warning/15 text-warning border-warning/20" },
    unpaid: { label: "Unpaid", className: "bg-destructive/15 text-destructive border-destructive/20" },
  };
  const info = map[status] || map.unpaid;
  return <span className={`text-[0.6rem] font-semibold px-1.5 py-0 rounded-full border ${info.className}`}>{info.label}</span>;
}
