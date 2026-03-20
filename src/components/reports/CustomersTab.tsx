import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Download } from "lucide-react";
import { formatOMR } from "@/lib/currency";
import { exportCustomersCSV } from "@/lib/report-exports";
import type { CustomerRecord } from "@/types/customer";

interface CustomersTabProps {
  allCustomers: CustomerRecord[];
  newCustomers: CustomerRecord[];
  topCustomers: { name: string; phone: string; spent: number; orders: number; balance: number; lastDate: string }[];
}

export function CustomersTab({ allCustomers, newCustomers, topCustomers }: CustomersTabProps) {
  const withBalance = topCustomers.filter((c) => c.balance > 0);
  const returning = topCustomers.filter((c) => c.orders > 1);

  if (allCustomers.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">No customer data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: allCustomers.length, accent: "text-primary" },
          { label: "New Customers", value: newCustomers.length, accent: "text-[hsl(var(--success))]" },
          { label: "Returning Customers", value: returning.length, accent: "text-primary" },
          { label: "With Outstanding Balance", value: withBalance.length, accent: "text-destructive" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              <p className={`text-xl font-bold mt-1 ${kpi.accent}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Customers */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Top Customers by Spending</h3>
            <Button variant="outline" size="sm" onClick={() => exportCustomersCSV(topCustomers)}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.slice(0, 20).map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="text-center">{c.orders}</TableCell>
                    <TableCell className="text-right font-medium">{formatOMR(c.spent)}</TableCell>
                    <TableCell className="text-right">
                      {c.balance > 0 ? <span className="text-destructive font-medium">{formatOMR(c.balance)}</span> : <span className="text-muted-foreground">{formatOMR(0)}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.lastDate || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customers with Balance */}
      {withBalance.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-destructive">Customers with Outstanding Balance ({withBalance.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withBalance.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{formatOMR(c.balance)}</TableCell>
                      <TableCell className="text-right">{formatOMR(c.spent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
