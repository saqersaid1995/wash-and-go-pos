import { useMemo, useState, useEffect, useCallback } from "react";
import type { WorkflowOrder, WorkflowStatus } from "@/types/workflow";
import { WORKFLOW_STAGES } from "@/types/workflow";
import type { CustomerRecord } from "@/types/customer";
import { fetchAllOrders, fetchAllCustomers } from "@/lib/supabase-queries";
import { fetchAllExpenses, type Expense } from "@/lib/expense-queries";

export type DateRange = "today" | "yesterday" | "this-week" | "this-month" | "all";

const todayStr = () => new Date().toISOString().split("T")[0];
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().split("T")[0];

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function filterByRange(orders: WorkflowOrder[], range: DateRange) {
  if (range === "all") return orders;
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (range === "today") return orders.filter((o) => o.orderDate === today);
  if (range === "yesterday") return orders.filter((o) => o.orderDate === yesterday);
  if (range === "this-week") return orders.filter((o) => o.orderDate >= startOfWeek());
  if (range === "this-month") return orders.filter((o) => o.orderDate >= startOfMonth());
  return orders;
}

function filterExpensesByRange(expenses: Expense[], range: DateRange) {
  if (range === "all") return expenses;
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (range === "today") return expenses.filter((e) => e.expense_date === today);
  if (range === "yesterday") return expenses.filter((e) => e.expense_date === yesterday);
  if (range === "this-week") return expenses.filter((e) => e.expense_date >= startOfWeek());
  if (range === "this-month") return expenses.filter((e) => e.expense_date >= startOfMonth());
  return expenses;
}

export function useReportsData() {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [allOrders, setAllOrders] = useState<WorkflowOrder[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ords, custs, exps] = await Promise.all([fetchAllOrders(), fetchAllCustomers(), fetchAllExpenses()]);
    setAllOrders(ords);
    setAllCustomers(custs);
    setAllExpenses(exps);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const orders = useMemo(() => filterByRange(allOrders, dateRange), [allOrders, dateRange]);
  const expenses = useMemo(() => filterExpensesByRange(allExpenses, dateRange), [allExpenses, dateRange]);
  const today = todayStr();

  const kpis = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
    const outstanding = orders.reduce((s, o) => s + o.remainingBalance, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const active = orders.filter((o) => o.currentStatus !== "delivered");
    const delivered = orders.filter((o) => o.currentStatus === "delivered");
    const readyForPickup = orders.filter((o) => o.currentStatus === "ready-for-pickup");
    const overdue = orders.filter((o) => o.deliveryDate < today && o.currentStatus !== "delivered");
    const urgent = orders.filter((o) => o.orderType === "urgent" && o.currentStatus !== "delivered");
    const todayOrders = allOrders.filter((o) => o.orderDate === today);
    const newCustomersToday = allCustomers.filter((c) => c.createdAt?.startsWith(today));
    const costPerOrder = orders.length > 0 ? totalExpenses / orders.length : 0;
    const profitPerOrder = orders.length > 0 ? netProfit / orders.length : 0;

    return {
      totalRevenue,
      totalPaid,
      outstanding,
      totalExpenses,
      netProfit,
      profitMargin,
      totalOrders: orders.length,
      activeOrders: active.length,
      deliveredOrders: delivered.length,
      readyForPickup: readyForPickup.length,
      overdueOrders: overdue.length,
      urgentOrders: urgent.length,
      ordersToday: todayOrders.length,
      totalCustomers: allCustomers.length,
      newCustomersToday: newCustomersToday.length,
      costPerOrder,
      profitPerOrder,
    };
  }, [orders, expenses, allOrders, allCustomers, today]);

  const statusDistribution = useMemo(() => {
    return WORKFLOW_STAGES.map((stage) => ({
      name: stage.label,
      value: orders.filter((o) => o.currentStatus === stage.id).length,
      id: stage.id,
    }));
  }, [orders]);

  const paymentDistribution = useMemo(() => {
    const paid = orders.filter((o) => o.paymentStatus === "paid").length;
    const partial = orders.filter((o) => o.paymentStatus === "partially-paid").length;
    const unpaid = orders.filter((o) => o.paymentStatus === "unpaid").length;
    return [
      { name: "Paid", value: paid, color: "hsl(var(--success))" },
      { name: "Partial", value: partial, color: "hsl(var(--warning))" },
      { name: "Unpaid", value: unpaid, color: "hsl(var(--destructive))" },
    ];
  }, [orders]);

  const serviceStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) =>
      o.items.forEach((item) => {
        if (!map[item.service]) map[item.service] = { count: 0, revenue: 0 };
        map[item.service].count += item.quantity;
        map[item.service].revenue += item.unitPrice * item.quantity;
      })
    );
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  const itemTypeStats = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) =>
      o.items.forEach((item) => {
        map[item.itemType] = (map[item.itemType] || 0) + item.quantity;
      })
    );
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [orders]);

  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; spent: number; orders: number; balance: number }> = {};
    orders.forEach((o) => {
      if (!map[o.customerName]) map[o.customerName] = { name: o.customerName, spent: 0, orders: 0, balance: 0 };
      map[o.customerName].spent += o.totalAmount;
      map[o.customerName].orders += 1;
      map[o.customerName].balance += o.remainingBalance;
    });
    return Object.values(map).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [orders]);

  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    allOrders.forEach((o) => {
      map[o.orderDate] = (map[o.orderDate] || 0) + o.totalAmount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }, [allOrders]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const revenueVsExpenses = useMemo(() => {
    const dateSet = new Set<string>();
    allOrders.forEach((o) => dateSet.add(o.orderDate));
    allExpenses.forEach((e) => dateSet.add(e.expense_date));

    const revMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    allOrders.forEach((o) => { revMap[o.orderDate] = (revMap[o.orderDate] || 0) + o.totalAmount; });
    allExpenses.forEach((e) => { expMap[e.expense_date] = (expMap[e.expense_date] || 0) + e.amount; });

    return Array.from(dateSet)
      .sort()
      .map((date) => ({
        date,
        revenue: revMap[date] || 0,
        expenses: expMap[date] || 0,
        profit: (revMap[date] || 0) - (expMap[date] || 0),
      }));
  }, [allOrders, allExpenses]);

  const mostProfitableService = useMemo(() => {
    if (serviceStats.length === 0) return null;
    return serviceStats[0];
  }, [serviceStats]);

  const mostPopularGarment = useMemo(() => {
    if (itemTypeStats.length === 0) return null;
    return itemTypeStats[0];
  }, [itemTypeStats]);

  const recentActivity = useMemo(() => {
    const activities: { id: string; orderNumber: string; customer: string; action: string; time: string; status: WorkflowStatus }[] = [];
    allOrders.forEach((o) => {
      o.statusHistory.forEach((sh) => {
        activities.push({
          id: sh.id,
          orderNumber: o.orderNumber,
          customer: o.customerName,
          action: sh.fromStatus ? `${capitalize(sh.fromStatus)} → ${capitalize(sh.toStatus)}` : `Created as ${capitalize(sh.toStatus)}`,
          time: sh.changedAt,
          status: sh.toStatus,
        });
      });
    });
    return activities.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  }, [allOrders]);

  return {
    dateRange, setDateRange, orders, expenses, loading, kpis,
    statusDistribution, paymentDistribution, serviceStats, itemTypeStats,
    topCustomers, revenueByDay, recentActivity, expensesByCategory,
    revenueVsExpenses, mostProfitableService, mostPopularGarment,
  };
}

function capitalize(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
