import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, ReferenceLine, Tooltip } from "recharts";
import { formatOMR } from "@/lib/currency";
import { TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3 } from "lucide-react";

const FIXED_CATEGORIES = ["Rent", "Loan", "Salaries"];

interface Expense {
  expense_date: string;
  category: string;
  amount: number;
}

interface Order {
  orderDate: string;
  totalAmount: number;
}

interface Props {
  orders: Order[];
  expenses: Expense[];
  revenueVsExpenses: { date: string; revenue: number; expenses: number; profit: number }[];
}

function aggregateWeekly(data: { date: string; revenue: number; varExpenses: number; profit: number; orderCount: number }[]) {
  const weeks: Record<string, { revenue: number; varExpenses: number; profit: number; orderCount: number }> = {};
  data.forEach((d) => {
    const dt = new Date(d.date);
    const weekStart = new Date(dt);
    weekStart.setDate(dt.getDate() - dt.getDay());
    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    if (!weeks[key]) weeks[key] = { revenue: 0, varExpenses: 0, profit: 0, orderCount: 0 };
    weeks[key].revenue += d.revenue;
    weeks[key].varExpenses += d.varExpenses;
    weeks[key].profit += d.profit;
    weeks[key].orderCount += d.orderCount;
  });
  return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: `W ${date.slice(5)}`, ...v }));
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;
  const exp = payload.find((p: any) => p.dataKey === "varExpenses")?.value ?? 0;
  const orders = payload.find((p: any) => p.dataKey === "revenue")?.payload?.orderCount ?? 0;
  const profit = rev - exp;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-[hsl(142,72%,40%)]">Revenue: {formatOMR(rev)}</p>
      <p className="text-destructive">Expenses: {formatOMR(exp)}</p>
      <p className={profit >= 0 ? "text-[hsl(230,60%,50%)]" : "text-destructive"}>Profit: {formatOMR(profit)}</p>
      <p className="text-muted-foreground">Orders: {orders}</p>
    </div>
  );
}

function ProfitTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const profit = payload[0]?.value ?? 0;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p className={profit >= 0 ? "text-[hsl(230,60%,50%)]" : "text-destructive"}>
        {profit >= 0 ? "Profit" : "Loss"}: {formatOMR(Math.abs(profit))}
      </p>
    </div>
  );
}

export function RevenueExpensesCharts({ orders, expenses, revenueVsExpenses }: Props) {
  const [view, setView] = useState<"daily" | "weekly">("daily");

  const { dailyData, fixedTotal, fixedByCategory } = useMemo(() => {
    const fixedExps = expenses.filter((e) => FIXED_CATEGORIES.includes(e.category));
    const varExps = expenses.filter((e) => !FIXED_CATEGORIES.includes(e.category));
    const fixedTotal = fixedExps.reduce((s, e) => s + e.amount, 0);
    const fixedByCategory: Record<string, number> = {};
    fixedExps.forEach((e) => { fixedByCategory[e.category] = (fixedByCategory[e.category] || 0) + e.amount; });

    const dateSet = new Set<string>();
    orders.forEach((o) => dateSet.add(o.orderDate));
    varExps.forEach((e) => dateSet.add(e.expense_date));

    const revMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    const ordCountMap: Record<string, number> = {};
    orders.forEach((o) => {
      revMap[o.orderDate] = (revMap[o.orderDate] || 0) + o.totalAmount;
      ordCountMap[o.orderDate] = (ordCountMap[o.orderDate] || 0) + 1;
    });
    varExps.forEach((e) => { expMap[e.expense_date] = (expMap[e.expense_date] || 0) + e.amount; });

    const dailyData = Array.from(dateSet).sort().map((date) => {
      const revenue = revMap[date] || 0;
      const varExpenses = expMap[date] || 0;
      return { date, revenue, varExpenses, profit: revenue - varExpenses, orderCount: ordCountMap[date] || 0 };
    });

    return { dailyData, fixedTotal, fixedByCategory };
  }, [orders, expenses]);

  const chartData = useMemo(() => {
    if (view === "weekly") return aggregateWeekly(dailyData);
    return dailyData.map((d) => ({ ...d, date: d.date.slice(5) }));
  }, [dailyData, view]);

  const avgRevenue = chartData.length > 0 ? chartData.reduce((s, d) => s + d.revenue, 0) / chartData.length : 0;
  const avgExpenses = chartData.length > 0 ? chartData.reduce((s, d) => s + d.varExpenses, 0) / chartData.length : 0;
  const avgProfit = chartData.length > 0 ? chartData.reduce((s, d) => s + d.profit, 0) / chartData.length : 0;

  if (chartData.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-3.5 w-3.5 text-[hsl(142,72%,40%)]" /><span className="text-xs text-muted-foreground">Avg {view === "daily" ? "Daily" : "Weekly"} Revenue</span></div>
          <p className="text-lg font-bold">{formatOMR(avgRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1"><Receipt className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-muted-foreground">Avg {view === "daily" ? "Daily" : "Weekly"} Expenses</span></div>
          <p className="text-lg font-bold">{formatOMR(avgExpenses)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">{avgProfit >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-[hsl(230,60%,50%)]" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}<span className="text-xs text-muted-foreground">Avg {view === "daily" ? "Daily" : "Weekly"} Profit</span></div>
          <p className="text-lg font-bold">{formatOMR(avgProfit)}</p>
        </CardContent></Card>
        {fixedTotal > 0 && (
          <Card className="border-dashed"><CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Fixed Expenses (excl.)</span></div>
            <p className="text-lg font-bold">{formatOMR(fixedTotal)}</p>
            <div className="mt-1 space-y-0.5">
              {Object.entries(fixedByCategory).map(([cat, amt]) => (
                <p key={cat} className="text-[10px] text-muted-foreground flex justify-between"><span>{cat}</span><span>{formatOMR(amt)}</span></p>
              ))}
            </div>
          </CardContent></Card>
        )}
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">View:</span>
        <div className="flex gap-1">
          <Button variant={view === "daily" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setView("daily")}>Daily</Button>
          <Button variant={view === "weekly" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setView("weekly")}>Weekly</Button>
        </div>
      </div>

      {/* Chart 1: Revenue vs Variable Expenses */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-4">Revenue vs Operating Expenses</h3>
          <ChartContainer config={{
            revenue: { label: "Revenue", color: "hsl(142, 72%, 40%)" },
            varExpenses: { label: "Expenses", color: "hsl(0, 72%, 51%)" },
          }} className="h-[260px] w-full">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={avgRevenue} stroke="hsl(142, 72%, 40%)" strokeDasharray="6 3" strokeOpacity={0.5} label={{ value: "Avg Rev", fontSize: 9, fill: "hsl(142, 72%, 40%)" }} />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(142, 72%, 40%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="varExpenses" name="Expenses" fill="hsl(0, 72%, 51%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Chart 2: Profit Trend */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-4">Profit Trend</h3>
          <ChartContainer config={{
            profit: { label: "Profit", color: "hsl(230, 60%, 50%)" },
          }} className="h-[200px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ProfitTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} />
              <ReferenceLine y={avgProfit} stroke="hsl(230, 60%, 50%)" strokeDasharray="6 3" strokeOpacity={0.5} label={{ value: "Avg", fontSize: 9, fill: "hsl(230, 60%, 50%)" }} />
              <Line type="monotone" dataKey="profit" stroke="hsl(230, 60%, 50%)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
