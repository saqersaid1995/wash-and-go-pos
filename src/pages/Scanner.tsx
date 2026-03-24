import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ScanLine, Search, Keyboard, X, Tag, Phone,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import { WORKFLOW_STAGES } from "@/types/workflow";
import {
  searchOrderByCode, updateOrderStatus, fetchCustomerByPhone, fetchOrdersByCustomerId,
} from "@/lib/supabase-queries";
import type { WorkflowOrder } from "@/types/workflow";
import QrScanner from "@/components/scan/QrScanner";
import ScanResultCard from "@/components/scan/ScanResultCard";
import OrderLabel from "@/components/scan/OrderLabel";
import PhoneSearchResults from "@/components/scan/PhoneSearchResults";

type SearchMode = "barcode" | "order" | "phone";

export default function Scanner() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SearchMode>("order");
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // Single-order state
  const [foundOrder, setFoundOrder] = useState<WorkflowOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [searching, setSearching] = useState(false);

  // Phone search state
  const [phoneCustomerName, setPhoneCustomerName] = useState("");
  const [phoneCustomerPhone, setPhoneCustomerPhone] = useState("");
  const [phoneOrders, setPhoneOrders] = useState<WorkflowOrder[]>([]);
  const [phoneNotFound, setPhoneNotFound] = useState(false);

  /* ── Single-order lookup ── */
  const lookupOrder = useCallback(async (code: string) => {
    const clean = code.trim().replace(/^ORDER:/, "");
    if (!clean) return;
    setSearching(true);
    clearPhoneResults();
    const order = await searchOrderByCode(clean);
    setSearching(false);
    if (order) {
      setFoundOrder(order);
      setNotFound(false);
      toast.success(`Order found: ${order.orderNumber}`);
    } else {
      setFoundOrder(null);
      setNotFound(true);
      toast.error("No matching order found");
    }
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lookupOrder(manualCode);
  };

  /* ── Phone lookup ── */
  const lookupPhone = useCallback(async (phone: string) => {
    const clean = phone.trim();
    if (!clean) return;
    setSearching(true);
    clearSingleResult();
    const customer = await fetchCustomerByPhone(clean);
    if (!customer) {
      setPhoneNotFound(true);
      setSearching(false);
      toast.error("No customer found with that phone number");
      return;
    }
    const orders = await fetchOrdersByCustomerId(customer.id);
    setPhoneCustomerName(customer.name);
    setPhoneCustomerPhone(customer.phone);
    setPhoneOrders(orders);
    setPhoneNotFound(false);
    setSearching(false);
    toast.success(`Found ${orders.length} order(s) for ${customer.name}`);
  }, []);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupPhone(phoneInput);
  };

  const refreshPhoneOrders = useCallback(async () => {
    if (!phoneCustomerPhone) return;
    const customer = await fetchCustomerByPhone(phoneCustomerPhone);
    if (!customer) return;
    const orders = await fetchOrdersByCustomerId(customer.id);
    setPhoneOrders(orders);
  }, [phoneCustomerPhone]);

  /* ── Single-order actions ── */
  const handleMoveNext = async () => {
    if (!foundOrder) return;
    const idx = WORKFLOW_STAGES.findIndex((s) => s.id === foundOrder.currentStatus);
    if (idx < WORKFLOW_STAGES.length - 1) {
      await updateOrderStatus(foundOrder.id, foundOrder.currentStatus, WORKFLOW_STAGES[idx + 1].id);
      toast.success("Order moved to next stage");
      const updated = await searchOrderByCode(foundOrder.orderNumber);
      if (updated) setFoundOrder(updated);
    }
  };

  const handleMarkDelivered = async () => {
    if (!foundOrder) return;
    if (foundOrder.remainingBalance > 0) {
      toast.error("Outstanding balance must be paid before delivery.");
      return;
    }
    await updateOrderStatus(foundOrder.id, foundOrder.currentStatus, "delivered");
    toast.success("Order successfully delivered");
    const updated = await searchOrderByCode(foundOrder.orderNumber);
    if (updated) setFoundOrder(updated);
  };

  const handleRefresh = async () => {
    if (!foundOrder) return;
    const updated = await searchOrderByCode(foundOrder.orderNumber);
    if (updated) setFoundOrder(updated);
  };

  const handlePrintInvoice = () => {
    if (!foundOrder) return;
    navigate(`/order/${foundOrder.id}`);
  };

  const handlePrintLabel = () => {
    setShowLabel(true);
    setTimeout(() => window.print(), 300);
  };

  /* ── Clear helpers ── */
  const clearSingleResult = () => {
    setFoundOrder(null);
    setNotFound(false);
    setShowLabel(false);
  };

  const clearPhoneResults = () => {
    setPhoneOrders([]);
    setPhoneCustomerName("");
    setPhoneCustomerPhone("");
    setPhoneNotFound(false);
  };

  const clearAll = () => {
    clearSingleResult();
    clearPhoneResults();
    setManualCode("");
    setPhoneInput("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm print:hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <ScanLine className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Scan / Pickup</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/workflow"><Button variant="outline" size="sm" className="h-8 text-xs">Workflow</Button></Link>
            <Link to="/"><Button variant="outline" size="sm" className="h-8 text-xs">New Order</Button></Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Search mode tabs */}
        <Tabs value={mode} onValueChange={(v) => { setMode(v as SearchMode); clearAll(); }} className="print:hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="barcode" className="text-xs gap-1.5">
              <ScanLine className="h-3.5 w-3.5" /> Barcode
            </TabsTrigger>
            <TabsTrigger value="order" className="text-xs gap-1.5">
              <Keyboard className="h-3.5 w-3.5" /> Order #
            </TabsTrigger>
            <TabsTrigger value="phone" className="text-xs gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Phone
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── Barcode mode ── */}
        {mode === "barcode" && (
          <section className="pos-section space-y-3 print:hidden">
            <h2 className="pos-label flex items-center gap-1.5">
              <ScanLine className="h-3.5 w-3.5" /> Camera / Barcode Scan
            </h2>
            <QrScanner onScan={lookupOrder} scanning={scanning} onToggle={() => setScanning(!scanning)} />
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Scan barcode or type code..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookupOrder(manualCode))}
                className="flex-1 text-sm"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-10 px-4 text-xs gap-1.5" disabled={searching}>
                <Search className="h-3.5 w-3.5" /> Lookup
              </Button>
            </form>
            <p className="text-[0.65rem] text-muted-foreground">
              Tip: Hardware barcode scanners work automatically.
            </p>
          </section>
        )}

        {/* ── Order # mode ── */}
        {mode === "order" && (
          <section className="pos-section space-y-3 print:hidden">
            <h2 className="pos-label flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5" /> Order Number Lookup
            </h2>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Enter order number..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookupOrder(manualCode))}
                className="flex-1 text-sm"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-10 px-4 text-xs gap-1.5" disabled={searching}>
                <Search className="h-3.5 w-3.5" /> Lookup
              </Button>
            </form>
          </section>
        )}

        {/* ── Phone mode ── */}
        {mode === "phone" && (
          <section className="pos-section space-y-3 print:hidden">
            <h2 className="pos-label flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Customer Phone Lookup
            </h2>
            <form onSubmit={handlePhoneSubmit} className="flex gap-2">
              <Input
                placeholder="Enter customer phone number..."
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-1 text-sm"
                autoFocus
                type="tel"
              />
              <Button type="submit" size="sm" className="h-10 px-4 text-xs gap-1.5" disabled={searching}>
                <Search className="h-3.5 w-3.5" /> Lookup
              </Button>
            </form>
            <p className="text-[0.65rem] text-muted-foreground">
              Search by phone to see all orders for a customer and process multi-order pickup.
            </p>
          </section>
        )}

        {/* ── Single-order not found ── */}
        {notFound && (mode === "barcode" || mode === "order") && (
          <div className="pos-section text-center space-y-3 print:hidden">
            <div className="text-destructive space-y-1">
              <X className="h-8 w-8 mx-auto opacity-60" />
              <p className="text-sm font-medium">No matching order found</p>
              <p className="text-xs text-muted-foreground">
                Check the code and try again, or search by phone in the{" "}
                <button onClick={() => setMode("phone")} className="text-primary underline">Phone</button> tab.
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearAll}>Try Again</Button>
          </div>
        )}

        {/* ── Phone not found ── */}
        {phoneNotFound && mode === "phone" && (
          <div className="pos-section text-center space-y-3 print:hidden">
            <div className="text-destructive space-y-1">
              <X className="h-8 w-8 mx-auto opacity-60" />
              <p className="text-sm font-medium">No customer found</p>
              <p className="text-xs text-muted-foreground">No customer matches that phone number.</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setPhoneNotFound(false); setPhoneInput(""); }}>Try Again</Button>
          </div>
        )}

        {/* ── Single-order result ── */}
        {foundOrder && (mode === "barcode" || mode === "order") && (
          <>
            <div className="flex items-center justify-between print:hidden">
              <h2 className="pos-label">Scan Result</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[0.65rem] gap-1" onClick={handlePrintLabel}>
                  <Tag className="h-3 w-3" /> Print Label
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[0.65rem]" onClick={clearAll}>Clear</Button>
              </div>
            </div>
            <div className="print:hidden">
              <ScanResultCard
                order={foundOrder}
                onMoveNext={handleMoveNext}
                onMarkDelivered={handleMarkDelivered}
                onPrint={handlePrintInvoice}
                onRefresh={handleRefresh}
              />
            </div>
            {showLabel && (
              <div className="label-print">
                <OrderLabel order={foundOrder} />
              </div>
            )}
          </>
        )}

        {/* ── Phone search results ── */}
        {phoneOrders.length > 0 && mode === "phone" && (
          <PhoneSearchResults
            customerName={phoneCustomerName}
            customerPhone={phoneCustomerPhone}
            orders={phoneOrders}
            onRefresh={refreshPhoneOrders}
          />
        )}

        {/* ── Empty state ── */}
        {!foundOrder && !notFound && phoneOrders.length === 0 && !phoneNotFound && (
          <div className="text-center py-8 text-muted-foreground print:hidden">
            <ScanLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {mode === "phone"
                ? "Enter a phone number to find customer orders"
                : "Scan a QR code or enter an order number to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
