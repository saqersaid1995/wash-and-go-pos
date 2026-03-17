import { useReportsData, type DateRange } from "@/hooks/useReportsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, Clock, Truck, AlertTriangle, Users, TrendingUp, Package } from "lucide-react";
import { NavLink } from "@/components/NavLink";

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
];

const Reports = () => {
  const data = useReportsData();

  const kpiCards = [
    { label: "Total Revenue", value: `$${data.kpis.totalRevenue.toFixed(2)}`, icon: DollarSign, accent: "text-primary" },
    { label: "Total Orders", value: data.kpis.totalOrders, icon: ShoppingCart, accent: "text-primary" },
    { label: "Active Orders", value: data.kpis.activeOrders, icon: Clock, accent: "text-warning" },
    { label: "Ready for Pickup", value: data.kpis.readyForPickup, icon: Package, accent: "text-primary" },
    { label: "Delivered", value: data.kpis.deliveredOrders, icon: Truck, accent: "text-success" },
    { label: "Overdue", value: data.kpis.overdueOrders, icon: AlertTriangle, accent: "text-destructive" },
    { label: "Outstanding", value: `$${data.kpis.outstanding.toFixed(2)}`, icon: DollarSign, accent: "text-destructive" },
    { label: "Customers", value: data.kpis.totalCustomers, icon: Users, accent: "text-primary" },
    { label: "New Today", value: data.kpis.newCustomersToday, icon: TrendingUp, accent: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <h1 className="text-lg font-bold tracking-tight">Reports & Analytics</h1>
          <div className="flex items-center gap-3">
            <NavLink to="/">POS</NavLink>
            <NavLink to="/workflow">Workflow</NavLink>
            <NavLink to="/customers">Customers</NavLink>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-[1600px] mx-auto space-y-6">
        {/* Date Range Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          <Select value={data.dateRange} onValueChange={(v) => data.setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          {kpiCards.map((kpi) => (
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

        {/* Row: Revenue Trend + Workflow Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
                <LineChart data={data.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

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
        </div>

        {/* Row: Payment Status + Service Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <span className="font-semibold">${data.kpis.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-semibold text-destructive">${data.kpis.outstanding.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top Services by Revenue</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
                <BarChart data={data.serviceStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row: Top Items + Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Popular Item Types</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Quantity", color: "hsl(var(--accent))" } }} className="h-[220px] w-full">
                <BarChart data={data.itemTypeStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers by Spending</CardTitle></CardHeader>
            <CardContent>
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
                      <TableCell className="text-right">${c.spent.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {c.balance > 0 ? (
                          <span className="text-destructive">${c.balance.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
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
                    <TableCell className="text-muted-foreground text-xs">{a.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
