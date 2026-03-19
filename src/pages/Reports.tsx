import { useReportsData, type DateRange } from "@/hooks/useReportsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import {
  DollarSign, ShoppingCart, Clock, Truck, AlertTriangle, Users, TrendingUp, TrendingDown,
  Package, Loader2, Receipt, Percent, Star, Shirt,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { formatOMR } from "@/lib/currency";
import { Link } from "react-router-dom";

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const PIE_COLORS = [
  "hsl(230, 60%, 50%)", "hsl(200, 70%, 50%)", "hsl(170, 60%, 45%)",
  "hsl(45, 80%, 50%)", "hsl(15, 80%, 55%)", "hsl(280, 50%, 55%)",
  "hsl(340, 60%, 50%)", "hsl(100, 50%, 45%)",
];

const Reports = () => {
  const data = useReportsData();

  if (data.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const financialCards = [
    { label: "Total Revenue", value: formatOMR(data.kpis.totalRevenue), icon: DollarSign, accent: "text-primary" },
    { label: "Total Expenses", value: formatOMR(data.kpis.totalExpenses), icon: Receipt, accent: "text-destructive" },
    { label: "Net Profit", value: formatOMR(data.kpis.netProfit), icon: data.kpis.netProfit >= 0 ? TrendingUp : TrendingDown, accent: data.kpis.netProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Profit Margin", value: `${data.kpis.profitMargin.toFixed(1)}%`, icon: Percent, accent: data.kpis.profitMargin >= 0 ? "text-success" : "text-destructive" },
  ];

  const operationalCards = [
    { label: "Total Orders", value: data.kpis.totalOrders, icon: ShoppingCart, accent: "text-primary" },
    { label: "Active Orders", value: data.kpis.activeOrders, icon: Clock, accent: "text-warning" },
    { label: "Ready for Pickup", value: data.kpis.readyForPickup, icon: Package, accent: "text-primary" },
    { label: "Delivered", value: data.kpis.deliveredOrders, icon: Truck, accent: "text-success" },
    { label: "Overdue", value: data.kpis.overdueOrders, icon: AlertTriangle, accent: "text-destructive" },
    { label: "Outstanding", value: formatOMR(data.kpis.outstanding), icon: DollarSign, accent: "text-destructive" },
    { label: "Customers", value: data.kpis.totalCustomers, icon: Users, accent: "text-primary" },
  ];

  const hasOrders = data.orders.length > 0;
  const hasExpenses = data.expenses.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <h1 className="text-lg font-bold tracking-tight">Business Performance</h1>
          <div className="flex items-center gap-3">
            <NavLink to="/">POS</NavLink>
            <NavLink to="/expenses">Expenses</NavLink>
            <NavLink to="/workflow">Workflow</NavLink>
            <NavLink to="/customers">Customers</NavLink>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          <Select value={data.dateRange} onValueChange={(v) => data.setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Financial KPIs */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Financial Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {financialCards.map((kpi) => (
              <Card key={kpi.label} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
                    <span className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Operational KPIs */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Operations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {operationalCards.map((kpi) => (
              <Card key={kpi.label} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
                    <span className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Business Insights */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Business Insights</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Cost / Order</span>
                </div>
                <p className="text-xl font-bold">{formatOMR(data.kpis.costPerOrder)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium text-muted-foreground">Profit / Order</span>
                </div>
                <p className="text-xl font-bold">{formatOMR(data.kpis.profitPerOrder)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium text-muted-foreground">Top Service</span>
                </div>
                <p className="text-lg font-bold truncate">{data.mostProfitableService?.name || "—"}</p>
                {data.mostProfitableService && <p className="text-xs text-muted-foreground">{formatOMR(data.mostProfitableService.revenue)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shirt className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Top Garment</span>
                </div>
                <p className="text-lg font-bold truncate">{data.mostPopularGarment?.name || "—"}</p>
                {data.mostPopularGarment && <p className="text-xs text-muted-foreground">{data.mostPopularGarment.count} items</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        {!hasOrders && !hasExpenses ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No analytics data yet</p>
            <p className="text-sm mt-1">Create orders or record expenses to see reports</p>
          </div>
        ) : (
          <>
            {/* Revenue vs Expenses Chart */}
            {data.revenueVsExpenses.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{
                    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                    expenses: { label: "Expenses", color: "hsl(var(--destructive))" },
                    profit: { label: "Profit", color: "hsl(170, 60%, 45%)" },
                  }} className="h-[280px] w-full">
                    <LineChart data={data.revenueVsExpenses}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="profit" stroke="hsl(170, 60%, 45%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Expense Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Expense Breakdown</CardTitle>
                    <Link to="/expenses" className="text-xs text-primary hover:underline">Manage →</Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.expensesByCategory.length > 0 ? (
                    <ChartContainer config={{ value: { label: "Amount" } }} className="h-[260px] w-full">
                      <PieChart>
                        <Pie data={data.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} label={({ name, value }) => `${name}: ${formatOMR(value)}`}>
                          {data.expensesByCategory.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded</p>
                  )}
                </CardContent>
              </Card>

              {/* Workflow Pipeline */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Workflow Pipeline</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ value: { label: "Orders" } }} className="h-[260px] w-full">
                    <PieChart>
                      <Pie data={data.statusDistribution.filter((s) => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                        {data.statusDistribution.filter((s) => s.value > 0).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Payment Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {data.paymentDistribution.map((p) => (
                      <div key={p.name} className="text-center p-3 rounded-lg bg-secondary">
                        <p className="text-2xl font-bold">{p.value}</p>
                        <p className="text-xs text-muted-foreground">{p.name}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-semibold">{formatOMR(data.kpis.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Outstanding</span>
                      <span className="font-semibold text-destructive">{formatOMR(data.kpis.outstanding)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top Services by Revenue</CardTitle></CardHeader>
                <CardContent>
                  {data.serviceStats.length > 0 ? (
                    <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
                      <BarChart data={data.serviceStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No service data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Popular Item Types</CardTitle></CardHeader>
                <CardContent>
                  {data.itemTypeStats.length > 0 ? (
                    <ChartContainer config={{ count: { label: "Quantity", color: "hsl(var(--accent))" } }} className="h-[220px] w-full">
                      <BarChart data={data.itemTypeStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No item data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers by Spending</CardTitle></CardHeader>
                <CardContent>
                  {data.topCustomers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topCustomers.map((c) => (
                          <TableRow key={c.name}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-right">{c.orders}</TableCell>
                            <TableCell className="text-right">{formatOMR(c.spent)}</TableCell>
                            <TableCell className="text-right">
                              {c.balance > 0 ? (
                                <span className="text-destructive">{formatOMR(c.balance)}</span>
                              ) : (
                                <span className="text-muted-foreground">{formatOMR(0)}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No customer data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  {data.recentActivity.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentActivity.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">{a.orderNumber}</TableCell>
                            <TableCell>{a.customer}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs font-normal">{a.action}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{new Date(a.time).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
