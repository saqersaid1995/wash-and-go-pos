import { useWorkflowState } from "@/hooks/useWorkflowState";
import SummaryCards from "@/components/workflow/SummaryCards";
import FilterBar from "@/components/workflow/FilterBar";
import WorkflowBoard from "@/components/workflow/WorkflowBoard";
import OrderDetailDrawer from "@/components/workflow/OrderDetailDrawer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Workflow() {
  const wf = useWorkflowState();

  const handleMoveNext = (id: string) => {
    wf.moveToNext(id);
    toast.success("Order moved to next stage");
  };

  const handleMovePrev = (id: string) => {
    wf.moveToPrev(id);
    toast.info("Order moved back");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Workflow</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">Operations Board</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> New Order
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-[1800px] mx-auto">
        <SummaryCards counts={wf.statusCounts} />
        <FilterBar filters={wf.filters} onFilterChange={wf.updateFilter} onReset={wf.resetFilters} />
        <WorkflowBoard
          ordersByStatus={wf.ordersByStatus}
          onSelectOrder={wf.setSelectedOrderId}
          onMoveNext={handleMoveNext}
          onMovePrev={handleMovePrev}
        />
      </div>

      <OrderDetailDrawer
        order={wf.selectedOrder}
        open={!!wf.selectedOrderId}
        onClose={() => wf.setSelectedOrderId(null)}
        onMoveNext={handleMoveNext}
        onMovePrev={handleMovePrev}
        onAddNote={wf.addNote}
        onToggleUrgent={wf.toggleUrgent}
      />
    </div>
  );
}
