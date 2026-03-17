import { useState, useMemo, useCallback } from "react";
import { MOCK_CUSTOMERS_DB, type CustomerRecord, type CustomerWithStats, type CustomerNote } from "@/types/customer";
import { MOCK_WORKFLOW_ORDERS, type WorkflowOrder } from "@/types/workflow";

function rid() {
  return Math.random().toString(36).substring(2, 10);
}

function buildCustomerStats(customer: CustomerRecord, orders: WorkflowOrder[]): CustomerWithStats {
  const customerOrders = orders.filter(
    (o) => o.customerPhone === customer.phone || o.customerName === customer.name
  );
  const activeOrders = customerOrders.filter((o) => o.currentStatus !== "delivered");
  const completedOrders = customerOrders.filter((o) => o.currentStatus === "delivered");
  const totalSpent = customerOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPaid = customerOrders.reduce((s, o) => s + o.paidAmount, 0);
  const unpaidOrderCount = customerOrders.filter((o) => o.paymentStatus === "unpaid").length;
  const partiallyPaidOrderCount = customerOrders.filter((o) => o.paymentStatus === "partially-paid").length;
  const sorted = [...customerOrders].sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  return {
    ...customer,
    totalOrders: customerOrders.length,
    activeOrders: activeOrders.length,
    completedOrders: completedOrders.length,
    totalSpent,
    totalPaid,
    outstandingBalance: Math.max(0, totalSpent - totalPaid),
    unpaidOrderCount,
    partiallyPaidOrderCount,
    lastOrderDate: sorted[0]?.orderDate ?? null,
    orders: customerOrders,
  };
}

export function useCustomerState() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(MOCK_CUSTOMERS_DB);
  const [orders] = useState<WorkflowOrder[]>(MOCK_WORKFLOW_ORDERS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "regular" | "vip">("all");
  const [balanceFilter, setBalanceFilter] = useState(false);

  const customersWithStats: CustomerWithStats[] = useMemo(
    () => customers.map((c) => buildCustomerStats(c, orders)),
    [customers, orders]
  );

  const filtered = useMemo(() => {
    let result = customersWithStats;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((c) => c.customerType === typeFilter);
    }
    if (balanceFilter) {
      result = result.filter((c) => c.outstandingBalance > 0);
    }
    return result;
  }, [customersWithStats, search, typeFilter, balanceFilter]);

  const getCustomer = useCallback(
    (id: string) => {
      const c = customers.find((c) => c.id === id);
      if (!c) return null;
      return buildCustomerStats(c, orders);
    },
    [customers, orders]
  );

  const addNote = useCallback((customerId: string, text: string, createdBy?: string) => {
    const note: CustomerNote = {
      id: rid(),
      customerId,
      text,
      createdAt: new Date().toISOString().split("T")[0],
      createdBy,
    };
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, notes: [...c.notes, note] } : c))
    );
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Pick<CustomerRecord, "name" | "phone" | "customerType">>) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString().split("T")[0] } : c
      )
    );
  }, []);

  const totals = useMemo(() => ({
    total: customersWithStats.length,
    vip: customersWithStats.filter((c) => c.customerType === "vip").length,
    withBalance: customersWithStats.filter((c) => c.outstandingBalance > 0).length,
    totalRevenue: customersWithStats.reduce((s, c) => s + c.totalSpent, 0),
  }), [customersWithStats]);

  return {
    customers: filtered,
    search, setSearch,
    typeFilter, setTypeFilter,
    balanceFilter, setBalanceFilter,
    getCustomer,
    addNote,
    updateCustomer,
    totals,
  };
}
