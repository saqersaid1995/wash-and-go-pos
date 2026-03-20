import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { DollarSign, ShoppingCart, Clock, Package, Truck, AlertTriangle, Users, TrendingUp, TrendingDown, Percent, Receipt, Star, Shirt, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatOMR } from "@/lib/currency";

const PIE_COLORS = [
  "hsl(230, 60%, 50%)", "hsl(142, 72%, 40%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(200, 70%, 50%)", "hsl(280, 50%, 55%)",
  "hsl(170, 60%, 45%)", "hsl(15, 80%, 55%)",
];

function ChangeIndicator({ current, previous, format = "number" }: { current: number; previous: number; format?: "number" | "currency" | "percent" }) {
  if (previous === 0 && current === 0) return null;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const isUp = change >= 0;
  return (
    <span className={`inline-flex items-center text-xs font-medium gap-0.5 ${isUp ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, accent, change }: { label: string; value: string | number; icon: any; accent: string; change?: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${accent}`} />
            <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
          </div>
          {change}
        </div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

interface OverviewTabProps {
  kpis: any;
  revenueVsExpenses: any[];
  expensesByCategory: { name: string; value: number }[];
  statusDistribution: { name: string; value: number }[];
  paymentDistribution: { name: string; value: number }[];
  serviceStats: { name: string; revenue: number; count: number }[];
  mostProfitableService: { name: string; revenue: number } | null;
  mostPopularGarment: { name: string; count: number } | null;
}

export function OverviewTab({ kpis, revenueVsExpenses, expensesByCategory, statusDistribution, paymentDistribution, serviceStats, mostProfitableService, mostPopularGarment }: OverviewTabProps) {
  const hasData = kpis.totalOrders > 0 || kpis.totalExpenses > 0;

  if (!hasData) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">No analytics data yet</p>
        <p className="text-sm mt-1">Create orders or record expenses to see reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Financial Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Revenue" value={formatOMR(kpis.totalRevenue)} icon={DollarSign} accent="text-[hsl(var(--success))]"
            change={<ChangeIndicator current={kpis.totalRevenue} previous={kpis.prevRevenue} />} />
          <KpiCard label="Total Expenses" value={formatOMR(kpis.totalExpenses)} icon={Receipt} accent="text-destructive"
            change={<ChangeIndicator current={kpis.totalExpenses} previous={kpis.prevTotalExpenses} />} />
          <KpiCard label={kpis.netProfit >= 0 ? "Net Profit" : "Net Loss"} value={formatOMR(kpis.netProfit)} icon={kpis.netProfit >= 0 ? TrendingUp : TrendingDown}
            accent={kpis.netProfit >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}
            change={<ChangeIndicator current={kpis.netProfit} previous={kpis.prevNetProfit} />} />
          <KpiCard label="Profit Margin" value={`${kpis.profitMargin.toFixed(1)}%`} icon={Percent}
            accent={kpis.profitMargin >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"} />
        </div>
      </section>

      {/* Operational KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Operations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Orders" value={kpis.totalOrders} icon={ShoppingCart} accent="text-primary"
            change={<ChangeIndicator current={kpis.totalOrders} previous={kpis.prevOrderCount} />} />
          <KpiCard label="Active Orders" value={kpis.activeOrders} icon={Clock} accent="text-[hsl(var(--warning))]" />
          <KpiCard label="Ready for Pickup" value={kpis.readyForPickup} icon={Package} accent="text-primary" />
          <KpiCard label="Delivered" value={kpis.deliveredOrders} icon={Truck} accent="text-[hsl(var(--success))]" />
          <KpiCard label="Overdue" value={kpis.overdueOrders} icon={AlertTriangle} accent="text-destructive" />
          <KpiCard label="Outstanding" value={formatOMR(kpis.outstanding)} icon={DollarSign} accent="text-[hsl(var(--warning))]" />
        </div>
      </section>

      {/* Business Insights */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Business Insights</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Avg Order Value" value={formatOMR(kpis.avgOrderValue)} icon={ShoppingCart} accent="text-primary" />
          <KpiCard label="Cost per Order" value={formatOMR(kpis.costPerOrder)} icon={Receipt} accent="text-muted-foreground" />
          <KpiCard label="Top Service" value={mostProfitableService?.name || "—"} icon={Star} accent="text-[hsl(var(--warning))]" />
          <KpiCard label="Top Garment" value={mostPopularGarment?.name || "—"} icon={Shirt} accent="text-primary" />
        </div>
      </section>

      {/* Charts */}
      {revenueVsExpenses.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Revenue vs Expenses Trend</h3>
            <ChartContainer config={{
              revenue: { label: "Revenue", color: "hsl(142, 72%, 40%)" },
              expenses: { label: "Expenses", color: "hsl(0, 72%, 51%)" },
              profit: { label: "Profit", color: "hsl(230, 60%, 50%)" },
            }} className="h-[280px] w-full">
              <LineChart data={revenueVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(142, 72%, 40%)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="profit" stroke="hsl(230, 60%, 50%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expense Breakdown */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Expense Breakdown</h3>
            {expensesByCategory.length > 0 ? (
              <ChartContainer config={{ value: { label: "Amount" } }} className="h-[240px] w-full">
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={2}
                    label={({ name, value }) => `${name}: ${formatOMR(value)}`}>
                    {expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded</p>}
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Workflow Pipeline</h3>
            <ChartContainer config={{ value: { label: "Orders" } }} className="h-[240px] w-full">
              <PieChart>
                <Pie data={statusDistribution.filter((s) => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {statusDistribution.filter((s) => s.value > 0).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Payment Status</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {paymentDistribution.map((p) => (
                <div key={p.name} className="text-center p-3 rounded-lg bg-secondary">
                  <p className="text-2xl font-bold">{p.value}</p>
                  <p className="text-xs text-muted-foreground">{p.name}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-semibold">{formatOMR(kpis.totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-destructive">{formatOMR(kpis.outstanding)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      {serviceStats.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Top Services by Revenue</h3>
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
              <BarChart data={serviceStats.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
