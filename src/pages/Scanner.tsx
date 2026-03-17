import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkflowState } from "@/hooks/useWorkflowState";
import { WORKFLOW_STAGES } from "@/types/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ScanLine, Search, ArrowLeft, Keyboard, X, Tag,
} from "lucide-react";
import { toast } from "sonner";
import QrScanner from "@/components/scan/QrScanner";
import ScanResultCard from "@/components/scan/ScanResultCard";
import OrderLabel from "@/components/scan/OrderLabel";

export default function Scanner() {
  const navigate = useNavigate();
  const wf = useWorkflowState();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [foundOrder, setFoundOrder] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  const lookupOrder = useCallback((code: string) => {
    const clean = code.trim().replace(/^ORDER:/, "");
    const order = wf.orders.find(
      (o) => o.orderNumber === clean || o.id === clean || o.orderNumber.includes(clean)
    );
    if (order) {
      setFoundOrder(order.id);
      setNotFound(false);
      toast.success(`Order found: ${order.orderNumber}`);
    } else {
      setFoundOrder(null);
      setNotFound(true);
      toast.error("No matching order found");
    }
  }, [wf.orders]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lookupOrder(manualCode);
  };

  const handleKeyboardScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Barcode scanners typically send Enter after the code
    if (e.key === "Enter") {
      e.preventDefault();
      lookupOrder(manualCode);
    }
  };

  const order = wf.orders.find((o) => o.id === foundOrder);

  const handleMoveNext = () => {
    if (!order) return;
    wf.moveToNext(order.id);
    toast.success("Order moved to next stage");
  };

  const handleMarkDelivered = () => {
    if (!order) return;
    wf.moveOrder(order.id, "delivered");
    toast.success("Order marked as delivered");
  };

  const handlePrintInvoice = () => {
    if (!order) return;
    navigate(`/order/${order.id}`);
  };

  const handlePrintLabel = () => {
    setShowLabel(true);
    setTimeout(() => window.print(), 300);
  };

  const clearResult = () => {
    setFoundOrder(null);
    setNotFound(false);
    setManualCode("");
    setShowLabel(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm print:hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <ScanLine className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Scan Order</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/workflow">
              <Button variant="outline" size="sm" className="h-8 text-xs">Workflow</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="h-8 text-xs">New Order</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Camera Scanner */}
        <section className="pos-section space-y-3 print:hidden">
          <h2 className="pos-label flex items-center gap-1.5">
            <ScanLine className="h-3.5 w-3.5" /> Camera Scan
          </h2>
          <QrScanner
            onScan={lookupOrder}
            scanning={scanning}
            onToggle={() => setScanning(!scanning)}
          />
        </section>

        {/* Manual Entry */}
        <section className="pos-section space-y-3 print:hidden">
          <h2 className="pos-label flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5" /> Manual Entry / Barcode Scanner
          </h2>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Scan barcode or type order number..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={handleKeyboardScan}
              className="flex-1 text-sm"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-10 px-4 text-xs gap-1.5">
              <Search className="h-3.5 w-3.5" /> Lookup
            </Button>
          </form>
          <p className="text-[0.65rem] text-muted-foreground">
            Tip: Hardware barcode scanners work automatically — just scan and the order will be found.
          </p>
        </section>

        {/* Not Found */}
        {notFound && (
          <div className="pos-section text-center space-y-3 print:hidden">
            <div className="text-destructive space-y-1">
              <X className="h-8 w-8 mx-auto opacity-60" />
              <p className="text-sm font-medium">No matching order found</p>
              <p className="text-xs text-muted-foreground">
                Check the code and try again, or search by phone number in{" "}
                <Link to="/workflow" className="text-primary underline">Workflow</Link>.
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearResult}>
              Try Again
            </Button>
          </div>
        )}

        {/* Scan Result */}
        {order && (
          <>
            <div className="flex items-center justify-between print:hidden">
              <h2 className="pos-label">Scan Result</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[0.65rem] gap-1" onClick={handlePrintLabel}>
                  <Tag className="h-3 w-3" /> Print Label
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[0.65rem]" onClick={clearResult}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="print:hidden">
              <ScanResultCard
                order={order}
                onMoveNext={handleMoveNext}
                onMarkDelivered={handleMarkDelivered}
                onPrint={handlePrintInvoice}
              />
            </div>

            {/* Printable Label */}
            {showLabel && (
              <div className="label-print">
                <OrderLabel order={order} />
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!order && !notFound && (
          <div className="text-center py-8 text-muted-foreground print:hidden">
            <ScanLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Scan a QR code or enter an order number to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
