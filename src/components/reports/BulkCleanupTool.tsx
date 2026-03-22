import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { bulkSoftDelete } from "@/lib/supabase-queries";
import { toast } from "sonner";

export function BulkCleanupTool({ onComplete }: { onComplete?: () => void }) {
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [beforeDate, setBeforeDate] = useState("");
  const [loading, setLoading] = useState(false);

  const hasFilters = draftsOnly || unpaidOnly || beforeDate;

  const handleCleanup = async () => {
    if (!hasFilters) {
      toast.error("Please select at least one filter before deleting.");
      return;
    }

    const confirmed = confirm(
      "Are you sure you want to delete matching orders? This will hide them from all views and reports."
    );
    if (!confirmed) return;

    setLoading(true);
    const count = await bulkSoftDelete({
      draftsOnly: draftsOnly || undefined,
      beforeDate: beforeDate || undefined,
      unpaidOnly: unpaidOnly || undefined,
    });
    setLoading(false);

    if (count > 0) {
      toast.success(`${count} order(s) deleted successfully.`);
      onComplete?.();
    } else {
      toast.info("No matching orders found.");
    }
  };

  return (
    <div className="pos-section space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-destructive" />
        <h3 className="font-semibold text-sm">Bulk Cleanup — Delete Test Orders</h3>
      </div>

      <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-destructive">
          This tool soft-deletes orders matching the selected filters. Deleted orders will be hidden from workflow, reports, and revenue calculations.
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={draftsOnly} onCheckedChange={(v) => setDraftsOnly(!!v)} />
          Draft orders only
          <Badge variant="secondary" className="text-[0.6rem]">Test data</Badge>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={unpaidOnly} onCheckedChange={(v) => setUnpaidOnly(!!v)} />
          Unpaid orders only
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Orders before:</span>
          <Input
            type="date"
            value={beforeDate}
            onChange={(e) => setBeforeDate(e.target.value)}
            className="w-44 h-8 text-sm"
          />
          {beforeDate && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setBeforeDate("")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="h-9 text-xs gap-1.5"
        disabled={!hasFilters || loading}
        onClick={handleCleanup}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete Matching Orders
      </Button>
    </div>
  );
}
