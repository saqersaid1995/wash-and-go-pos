import { useState, useCallback, useMemo } from "react";
import type { WorkflowOrder, WorkflowStatus, StatusChange, InternalNote } from "@/types/workflow";
import { MOCK_WORKFLOW_ORDERS, WORKFLOW_STAGES } from "@/types/workflow";

function randomId() {
  return Math.random().toString(36).substring(2, 10);
}

export interface WorkflowFilters {
  search: string;
  status: WorkflowStatus | "all";
  orderType: "all" | "regular" | "urgent";
  paymentStatus: "all" | "unpaid" | "partially-paid" | "paid";
  dateFilter: "all" | "today" | "overdue";
}

const initialFilters: WorkflowFilters = {
  search: "",
  status: "all",
  orderType: "all",
  paymentStatus: "all",
  dateFilter: "all",
};

export function useWorkflowState() {
  const [orders, setOrders] = useState<WorkflowOrder[]>(MOCK_WORKFLOW_ORDERS);
  const [filters, setFilters] = useState<WorkflowFilters>(initialFilters);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const updateFilter = useCallback(<K extends keyof WorkflowFilters>(key: K, value: WorkflowFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(initialFilters), []);

  const moveOrder = useCallback((orderId: string, toStatus: WorkflowStatus, changedBy?: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const change: StatusChange = {
          id: randomId(),
          orderId,
          fromStatus: order.currentStatus,
          toStatus,
          changedAt: new Date().toISOString(),
          changedBy,
        };
        return {
          ...order,
          currentStatus: toStatus,
          statusUpdatedAt: new Date().toISOString(),
          statusHistory: [...order.statusHistory, change],
        };
      })
    );
  }, []);

  const moveToNext = useCallback((orderId: string, changedBy?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const idx = WORKFLOW_STAGES.findIndex((s) => s.id === order.currentStatus);
    if (idx < WORKFLOW_STAGES.length - 1) {
      moveOrder(orderId, WORKFLOW_STAGES[idx + 1].id, changedBy);
    }
  }, [orders, moveOrder]);

  const moveToPrev = useCallback((orderId: string, changedBy?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const idx = WORKFLOW_STAGES.findIndex((s) => s.id === order.currentStatus);
    if (idx > 0) {
      moveOrder(orderId, WORKFLOW_STAGES[idx - 1].id, changedBy);
    }
  }, [orders, moveOrder]);

  const addNote = useCallback((orderId: string, text: string, createdBy?: string) => {
    const note: InternalNote = {
      id: randomId(),
      orderId,
      text,
      createdAt: new Date().toISOString(),
      createdBy,
    };
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, internalNotes: [...order.internalNotes, note] }
          : order
      )
    );
  }, []);

  const toggleUrgent = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, orderType: order.orderType === "urgent" ? "regular" : "urgent" }
          : order
      )
    );
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const match =
          order.orderNumber.toLowerCase().includes(s) ||
          order.customerName.toLowerCase().includes(s) ||
          order.customerPhone.includes(s);
        if (!match) return false;
      }
      if (filters.status !== "all" && order.currentStatus !== filters.status) return false;
      if (filters.orderType !== "all" && order.orderType !== filters.orderType) return false;
      if (filters.paymentStatus !== "all" && order.paymentStatus !== filters.paymentStatus) return false;
      if (filters.dateFilter === "today" && order.orderDate !== today) return false;
      if (filters.dateFilter === "overdue" && order.deliveryDate >= today) return false;
      return true;
    });
  }, [orders, filters, today]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { total: 0, urgent: 0 };
    WORKFLOW_STAGES.forEach((s) => (counts[s.id] = 0));
    orders.forEach((o) => {
      if (o.orderDate === today || o.currentStatus !== "delivered") {
        counts.total++;
      }
      counts[o.currentStatus] = (counts[o.currentStatus] || 0) + 1;
      if (o.orderType === "urgent" && o.currentStatus !== "delivered") counts.urgent++;
    });
    return counts;
  }, [orders, today]);

  const ordersByStatus = useMemo(() => {
    const map: Record<WorkflowStatus, WorkflowOrder[]> = {
      received: [], washing: [], drying: [], ironing: [], "ready-for-pickup": [], delivered: [],
    };
    filteredOrders.forEach((o) => {
      map[o.currentStatus].push(o);
    });
    // Sort urgent first in each column
    Object.keys(map).forEach((key) => {
      map[key as WorkflowStatus].sort((a, b) => {
        if (a.orderType === "urgent" && b.orderType !== "urgent") return -1;
        if (a.orderType !== "urgent" && b.orderType === "urgent") return 1;
        return 0;
      });
    });
    return map;
  }, [filteredOrders]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  return {
    orders,
    filters,
    updateFilter,
    resetFilters,
    filteredOrders,
    ordersByStatus,
    statusCounts,
    moveOrder,
    moveToNext,
    moveToPrev,
    addNote,
    toggleUrgent,
    selectedOrder,
    selectedOrderId,
    setSelectedOrderId,
  };
}
