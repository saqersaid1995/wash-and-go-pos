import { useState, useCallback } from "react";
import { v4 } from "crypto";
import type { OrderItem, OrderType, PickupMethod, PaymentMethod, PaymentStatus, Customer } from "@/types/pos";
import { SERVICES, MOCK_CUSTOMERS } from "@/types/pos";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${y}${m}${d}-${rand}`;
}

const URGENT_MULTIPLIER = 1.5;
const TAX_RATE = 0.05;

export function usePOSState() {
  // Customer
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  // Order details
  const [orderNumber] = useState(generateOrderNumber);
  const [orderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("regular");
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>("walk-in");
  const [employeeId, setEmployeeId] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Items
  const [items, setItems] = useState<OrderItem[]>([]);

  // Payment
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paidAmount, setPaidAmount] = useState(0);

  // Invoice
  const [showInvoice, setShowInvoice] = useState(false);

  // Customer search
  const searchCustomer = useCallback((phone: string) => {
    setCustomerPhone(phone);
    const found = MOCK_CUSTOMERS.find((c) => c.phone === phone);
    if (found) {
      setMatchedCustomer(found);
      setCustomerName(found.name);
      setCustomerNotes(found.notes || "");
    } else {
      setMatchedCustomer(null);
    }
  }, []);

  // Item management
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        itemType: "",
        serviceId: "wash-iron",
        quantity: 1,
        unitPrice: SERVICES.find((s) => s.id === "wash-iron")!.price,
        conditions: [],
      },
    ]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<OrderItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        // If service changed, update price
        if (updates.serviceId) {
          const svc = SERVICES.find((s) => s.id === updates.serviceId);
          if (svc) updated.unitPrice = svc.price;
        }
        return updated;
      })
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const urgentFee = orderType === "urgent" ? subtotal * (URGENT_MULTIPLIER - 1) : 0;
  const taxableAmount = subtotal + urgentFee - discount;
  const tax = Math.max(0, taxableAmount * TAX_RATE);
  const total = Math.max(0, taxableAmount + tax);
  const remainingBalance = Math.max(0, total - paidAmount);

  const paymentStatus: PaymentStatus =
    paidAmount >= total && total > 0 ? "paid" : paidAmount > 0 ? "partially-paid" : "unpaid";

  const clearForm = useCallback(() => {
    setCustomerPhone("");
    setCustomerName("");
    setCustomerNotes("");
    setMatchedCustomer(null);
    setDeliveryDate("");
    setOrderType("regular");
    setPickupMethod("walk-in");
    setEmployeeId("");
    setOrderNotes("");
    setItems([]);
    setDiscount(0);
    setPaymentMethod("cash");
    setPaidAmount(0);
    setShowInvoice(false);
  }, []);

  return {
    // Customer
    customerPhone, customerName, customerNotes, matchedCustomer,
    setCustomerPhone: searchCustomer, setCustomerName, setCustomerNotes,
    // Order
    orderNumber, orderDate, deliveryDate, setDeliveryDate,
    orderType, setOrderType, pickupMethod, setPickupMethod,
    employeeId, setEmployeeId, orderNotes, setOrderNotes,
    // Items
    items, addItem, updateItem, removeItem,
    // Pricing
    subtotal, urgentFee, discount, setDiscount, tax, total,
    paidAmount, setPaidAmount, remainingBalance, paymentStatus,
    // Payment
    paymentMethod, setPaymentMethod,
    // Invoice
    showInvoice, setShowInvoice,
    // Actions
    clearForm,
  };
}
