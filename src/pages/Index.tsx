// Laundry POS - Real Data Mode
import { usePOSState } from "@/hooks/usePOSState";
import CustomerSection from "@/components/pos/CustomerSection";
import OrderDetailsSection from "@/components/pos/OrderDetailsSection";
import GarmentTable from "@/components/pos/GarmentTable";
import PricingSummary from "@/components/pos/PricingSummary";
import ActionButtons from "@/components/pos/ActionButtons";
import InvoiceModal from "@/components/pos/InvoiceModal";
import { formatOMR } from "@/lib/currency";
import { toast } from "sonner";

const Index = () => {
  const pos = usePOSState();

  const handleSave = async () => {
    if (pos.items.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }
    if (!pos.customerName.trim() && !pos.customerPhone.trim()) {
      toast.error("Customer name or phone is required.");
      return;
    }
    const result = await pos.saveOrder();
    if (result.success) {
      toast.success(`Order ${pos.orderNumber} saved!`);
      pos.clearForm();
    } else {
      toast.error(result.error || "Failed to save order");
    }
  };

  const handleSaveAndPrint = async () => {
    if (pos.items.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }
    if (!pos.customerName.trim() && !pos.customerPhone.trim()) {
      toast.error("Customer name or phone is required.");
      return;
    }
    const result = await pos.saveOrder();
    if (result.success) {
      toast.success(`Order ${pos.orderNumber} saved!`);
      pos.setShowInvoice(true);
    } else {
      toast.error(result.error || "Failed to save order");
    }
  };

  const handleSaveAndProcess = async () => {
    if (pos.items.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }
    const result = await pos.saveOrder();
    if (result.success) {
      toast.success(`Order ${pos.orderNumber} saved and sent to processing!`);
      pos.clearForm();
    } else {
      toast.error(result.error || "Failed to save order");
    }
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
              {pos.items.length} Items • {formatOMR(pos.total)}
            </span>
            <a href="/scan" className="text-xs font-medium text-primary hover:underline">Scan →</a>
            <a href="/customers" className="text-xs font-medium text-primary hover:underline">Customers →</a>
            <a href="/workflow" className="text-xs font-medium text-primary hover:underline">Workflow →</a>
            <a href="/reports" className="text-xs font-medium text-primary hover:underline">Reports →</a>
            <a href="/services" className="text-xs font-medium text-primary hover:underline">Pricing →</a>
            <a href="/whatsapp" className="text-xs font-medium text-primary hover:underline">WhatsApp →</a>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] mx-auto">
        <div className="lg:w-[65%] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomerSection
              phone={pos.customerPhone}
              name={pos.customerName}
              notes={pos.customerNotes}
              matchedCustomer={pos.matchedCustomer ? { id: pos.matchedCustomer.id, phone: pos.matchedCustomer.phone, name: pos.matchedCustomer.name, notes: pos.matchedCustomer.notes?.[0]?.text } : null}
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
              orderNotes={pos.orderNotes}
              onDeliveryDateChange={pos.setDeliveryDate}
              onOrderTypeChange={pos.setOrderType}
              onPickupMethodChange={pos.setPickupMethod}
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

        <div className="lg:w-[35%]">
          <div className="lg:sticky lg:top-20 space-y-4">
            <PricingSummary
              subtotal={pos.subtotal}
              urgentFee={pos.urgentFee}
              discount={pos.discount}
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
              disabled={pos.items.length === 0 || pos.saving}
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
          onClose={() => {
            pos.setShowInvoice(false);
            pos.clearForm();
          }}
        />
      )}
    </div>
  );
};

export default Index;
