import type { WorkflowOrder, WorkflowStatus } from "@/types/workflow";
import { WORKFLOW_STAGES } from "@/types/workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, AlertTriangle, Clock, CreditCard } from "lucide-react";

interface OrderCardProps {
  order: WorkflowOrder;
  onSelect: (id: string) => void;
  onMoveNext: (id: string) => void;
  onMovePrev: (id: string) => void;
}

export default function OrderCard({ order, onSelect, onMoveNext, onMovePrev }: OrderCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = order.deliveryDate < today && order.currentStatus !== "delivered";
  const isDueToday = order.deliveryDate === today && order.currentStatus !== "delivered";
  const stageIdx = WORKFLOW_STAGES.findIndex((s) => s.id === order.currentStatus);
  const canMoveNext = stageIdx < WORKFLOW_STAGES.length - 1;
  const canMovePrev = stageIdx > 0;

  return (
    <div
      className={`pos-section p-3 space-y-2 cursor-pointer hover:border-primary/30 transition-colors ${
        order.orderType === "urgent" ? "border-accent/40 bg-accent/5" : ""
      } ${isOverdue ? "ring-1 ring-destructive/40" : ""}`}
      onClick={() => onSelect(order.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-mono font-semibold truncate">{order.orderNumber}</span>
        <div className="flex gap-1 shrink-0">
          {order.orderType === "urgent" && (
            <Badge className="bg-accent text-accent-foreground text-[0.6rem] px-1.5 py-0">Urgent</Badge>
          )}
          {isOverdue && (
            <Badge variant="destructive" className="text-[0.6rem] px-1.5 py-0">Overdue</Badge>
          )}
          {isDueToday && !isOverdue && (
            <Badge className="bg-warning text-warning-foreground text-[0.6rem] px-1.5 py-0">Due Today</Badge>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-0.5">
        <p className="text-sm font-medium truncate">{order.customerName}</p>
        <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {order.deliveryDate}
        </span>
        <span>{order.itemCount} items</span>
      </div>

      {/* Payment */}
      <div className="flex items-center gap-1.5">
        <CreditCard className="h-3 w-3 text-muted-foreground" />
        <PaymentBadge status={order.paymentStatus} />
        <span className="text-xs font-medium ml-auto">${order.totalAmount.toFixed(2)}</span>
      </div>

      {/* Notes preview */}
      {order.orderNotes && (
        <p className="text-[0.65rem] text-muted-foreground truncate italic">{order.orderNotes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs flex-1"
          disabled={!canMovePrev}
          onClick={() => onMovePrev(order.id)}
        >
          <ChevronLeft className="h-3 w-3" />
          Back
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-xs flex-1"
          disabled={!canMoveNext}
          onClick={() => onMoveNext(order.id)}
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
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
  return <span className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full border ${info.className}`}>{info.label}</span>;
}
