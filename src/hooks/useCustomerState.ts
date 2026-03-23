import { useState, useMemo, useCallback, useEffect } from "react";
import type { CustomerRecord, CustomerWithStats } from "@/types/customer";
import type { WorkflowOrder } from "@/types/workflow";
import {
  fetchAllCustomers,
  fetchCustomerById,
  fetchOrdersByCustomerId,
  addCustomerNote as addCustomerNoteDb,
  updateCustomerRecord,
  deleteCustomer as deleteCustomerDb,
  archiveCustomer as archiveCustomerDb,
  restoreCustomer as restoreCustomerDb,
  customerHasOrders,
  fetchAllOrders,
} from "@/lib/supabase-queries";

function buildCustomerStats(customer: CustomerRecord, orders: WorkflowOrder[]): CustomerWithStats {
  const activeOrders = orders.filter((o) => o.currentStatus !== "delivered");
  const completedOrders = orders.filter((o) => o.currentStatus === "delivered");
  const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
  const unpaidOrderCount = orders.filter((o) => o.paymentStatus === "unpaid").length;
  const partiallyPaidOrderCount = orders.filter((o) => o.paymentStatus === "partially-paid").length;
  const sorted = [...orders].sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  return {
    ...customer,
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    completedOrders: completedOrders.length,
    totalSpent,
    totalPaid,
    outstandingBalance: Math.max(0, totalSpent - totalPaid),
    unpaidOrderCount,
    partiallyPaidOrderCount,
    lastOrderDate: sorted[0]?.orderDate ?? null,
    orders,
  };
}

export function useCustomerState() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [allOrders, setAllOrders] = useState<WorkflowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "regular" | "vip">("all");
  const [balanceFilter, setBalanceFilter] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [custs, ords] = await Promise.all([fetchAllCustomers(), fetchAllOrders()]);
    setCustomers(custs);
    setAllOrders(ords);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const customersWithStats: CustomerWithStats[] = useMemo(
    () =>
      customers.map((c) => {
        const custOrders = allOrders.filter(
          (o) => o.customerPhone === c.phone || o.customerName === c.name
        );
        return buildCustomerStats(c, custOrders);
      }),
    [customers, allOrders]
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
      const custOrders = allOrders.filter(
        (o) => o.customerPhone === c.phone || o.customerName === c.name
      );
      return buildCustomerStats(c, custOrders);
    },
    [customers, allOrders]
  );

  const addNote = useCallback(async (customerId: string, text: string, createdBy?: string) => {
    const success = await addCustomerNoteDb(customerId, text, createdBy);
    if (success) await loadData();
  }, [loadData]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Pick<CustomerRecord, "name" | "phone" | "customerType">>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.phone) dbUpdates.phone_number = updates.phone;
    if (updates.customerType) dbUpdates.customer_type = updates.customerType === "vip" ? "VIP" : "Regular";

    const success = await updateCustomerRecord(id, dbUpdates);
    if (success) await loadData();
  }, [loadData]);

  const totals = useMemo(() => ({
    total: customersWithStats.length,
    vip: customersWithStats.filter((c) => c.customerType === "vip").length,
    withBalance: customersWithStats.filter((c) => c.outstandingBalance > 0).length,
    totalRevenue: customersWithStats.reduce((s, c) => s + c.totalSpent, 0),
  }), [customersWithStats]);

  return {
    customers: filtered,
    loading,
    search, setSearch,
    typeFilter, setTypeFilter,
    balanceFilter, setBalanceFilter,
    getCustomer,
    addNote,
    updateCustomer,
    totals,
    refetch: loadData,
  };
}
