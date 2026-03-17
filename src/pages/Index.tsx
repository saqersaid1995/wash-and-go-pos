// Laundry POS - Phase 1
import { usePOSState } from "@/hooks/usePOSState";
import CustomerSection from "@/components/pos/CustomerSection";
import OrderDetailsSection from "@/components/pos/OrderDetailsSection";
import GarmentTable from "@/components/pos/GarmentTable";
import PricingSummary from "@/components/pos/PricingSummary";
import ActionButtons from "@/components/pos/ActionButtons";
import InvoiceModal from "@/components/pos/InvoiceModal";
import { toast } from "sonner";

const Index = () => {
  const pos = usePOSState();

  const handleSave = () => {
    if (pos.items.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }
    toast.success(`Order ${pos.orderNumber} saved!`);
  };

  const handleSaveAndPrint = () => {
    if (pos.items.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }
    pos.setShowInvoice(true);
  };

  const handleSaveAndProcess = () => {
    handleSave();
    toast.info("Order sent to processing queue.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">New Order</h1>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {pos.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {pos.items.length} Items • ${pos.total.toFixed(2)}
            </span>
            <a href="/scan" className="text-xs font-medium text-primary hover:underline">Scan →</a>
            <a href="/customers" className="text-xs font-medium text-primary hover:underline">Customers →</a>
            <a href="/workflow" className="text-xs font-medium text-primary hover:underline">Workflow →</a>
            <a href="/reports" className="text-xs font-medium text-primary hover:underline">Reports →</a>
          </div>
        </div>
      </header>

      {/* Main Layout: Left 65% / Right 35% */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] mx-auto">
        {/* Left Panel */}
        <div className="lg:w-[65%] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomerSection
              phone={pos.customerPhone}
              name={pos.customerName}
              notes={pos.customerNotes}
              matchedCustomer={pos.matchedCustomer}
              onPhoneChange={pos.setCustomerPhone}
              onNameChange={pos.setCustomerName}
              onNotesChange={pos.setCustomerNotes}
            />
            <OrderDetailsSection
              orderNumber={pos.orderNumber}
              orderDate={pos.orderDate}
              deliveryDate={pos.deliveryDate}
              orderType={pos.orderType}
              pickupMethod={pos.pickupMethod}
              employeeId={pos.employeeId}
              orderNotes={pos.orderNotes}
              onDeliveryDateChange={pos.setDeliveryDate}
              onOrderTypeChange={pos.setOrderType}
              onPickupMethodChange={pos.setPickupMethod}
              onEmployeeChange={pos.setEmployeeId}
              onNotesChange={pos.setOrderNotes}
            />
          </div>
          <GarmentTable
            items={pos.items}
            onAdd={pos.addItem}
            onUpdate={pos.updateItem}
            onRemove={pos.removeItem}
          />
        </div>

        {/* Right Panel - Sticky */}
        <div className="lg:w-[35%]">
          <div className="lg:sticky lg:top-20 space-y-4">
            <PricingSummary
              subtotal={pos.subtotal}
              urgentFee={pos.urgentFee}
              discount={pos.discount}
              tax={pos.tax}
              total={pos.total}
              paidAmount={pos.paidAmount}
              remainingBalance={pos.remainingBalance}
              paymentStatus={pos.paymentStatus}
              paymentMethod={pos.paymentMethod}
              onDiscountChange={pos.setDiscount}
              onPaidAmountChange={pos.setPaidAmount}
              onPaymentMethodChange={pos.setPaymentMethod}
            />
            <ActionButtons
              onSave={handleSave}
              onSaveAndPrint={handleSaveAndPrint}
              onSaveAndProcess={handleSaveAndProcess}
              onCancel={pos.clearForm}
              onClear={pos.clearForm}
              disabled={pos.items.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {pos.showInvoice && (
        <InvoiceModal
          orderNumber={pos.orderNumber}
          customerName={pos.customerName}
          customerPhone={pos.customerPhone}
          orderDate={pos.orderDate}
          deliveryDate={pos.deliveryDate}
          items={pos.items}
          total={pos.total}
          paidAmount={pos.paidAmount}
          remainingBalance={pos.remainingBalance}
          onClose={() => pos.setShowInvoice(false)}
        />
      )}
    </div>
  );
};

export default Index;
