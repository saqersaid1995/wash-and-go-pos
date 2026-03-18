import { useState, useCallback } from "react";
import type { OrderItem, OrderType, PickupMethod, PaymentMethod, PaymentStatus } from "@/types/pos";
import { generateOrderNumber, createOrder, fetchCustomerByPhone } from "@/lib/supabase-queries";
import type { CustomerRecord } from "@/types/customer";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

const URGENT_MULTIPLIER = 1.5;


export function usePOSState() {
  // Customer
  const [customerPhone, setCustomerPhoneRaw] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerRecord | null>(null);
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);

  // Order details
  const [orderNumber, setOrderNumber] = useState(generateOrderNumber);
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

  // Invoice & saving
  const [showInvoice, setShowInvoice] = useState(false);
  const [saving, setSaving] = useState(false);

  // Customer search - async
  const searchCustomer = useCallback(async (phone: string) => {
    setCustomerPhoneRaw(phone);
    if (phone.length >= 4) {
      const found = await fetchCustomerByPhone(phone);
      if (found) {
        setMatchedCustomer(found);
        setMatchedCustomerId(found.id);
        setCustomerName(found.name);
        setCustomerNotes(found.notes?.[0]?.text || "");
      } else {
        setMatchedCustomer(null);
        setMatchedCustomerId(null);
      }
    } else {
      setMatchedCustomer(null);
      setMatchedCustomerId(null);
    }
  }, []);

  // Item management
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        itemType: "",
        serviceId: "",
        quantity: 1,
        unitPrice: 0,
        conditions: [],
      },
    ]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<OrderItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, ...updates };
      })
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const urgentFee = orderType === "urgent" ? subtotal * (URGENT_MULTIPLIER - 1) : 0;
  const total = Math.max(0, subtotal + urgentFee - discount);
  const remainingBalance = Math.max(0, total - paidAmount);

  const paymentStatus: PaymentStatus =
    paidAmount >= total && total > 0 ? "paid" : paidAmount > 0 ? "partially-paid" : "unpaid";

  // Save to Supabase
  const saveOrder = useCallback(async () => {
    if (items.length === 0) return { success: false, error: "No items" };
    if (!customerName.trim() && !customerPhone.trim()) {
      return { success: false, error: "Customer name or phone required" };
    }

    setSaving(true);
    try {
      const result = await createOrder({
        customerId: matchedCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderNumber,
        orderDate,
        deliveryDate,
        orderType,
        pickupMethod,
        employeeId,
        orderNotes,
        items: items.map((item) => ({
          itemType: item.itemType,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          color: item.color,
          brand: item.brand,
          notes: item.notes,
          conditions: item.conditions,
        })),
        subtotal,
        urgentFee,
        discount,
        tax,
        total,
        paidAmount,
        remainingBalance,
        paymentMethod,
        paymentStatus,
      });
      return result;
    } finally {
      setSaving(false);
    }
  }, [
    items, customerName, customerPhone, matchedCustomerId,
    orderNumber, orderDate, deliveryDate, orderType, pickupMethod,
    employeeId, orderNotes, subtotal, urgentFee, discount, tax,
    total, paidAmount, remainingBalance, paymentMethod, paymentStatus,
  ]);

  const clearForm = useCallback(() => {
    setCustomerPhoneRaw("");
    setCustomerName("");
    setCustomerNotes("");
    setMatchedCustomer(null);
    setMatchedCustomerId(null);
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
    setOrderNumber(generateOrderNumber());
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
    saveOrder, saving, clearForm,
  };
}
