import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Crown, AlertCircle, DollarSign, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCustomerState } from "@/hooks/useCustomerState";

export default function Customers() {
  const nav = useNavigate();
  const state = useCustomerState();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">Customers</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs font-medium text-primary hover:underline">POS →</a>
            <a href="/workflow" className="text-xs font-medium text-primary hover:underline">Workflow →</a>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-[1400px] mx-auto space-y-4">
        {state.loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={<Users className="w-4 h-4" />} label="Total Customers" value={state.totals.total} />
              <SummaryCard icon={<Crown className="w-4 h-4" />} label="VIP Customers" value={state.totals.vip} accent />
              <SummaryCard icon={<AlertCircle className="w-4 h-4" />} label="With Balance" value={state.totals.withBalance} warning={state.totals.withBalance > 0} />
              <SummaryCard icon={<DollarSign className="w-4 h-4" />} label="Total Revenue" value={`$${state.totals.totalRevenue.toFixed(2)}`} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={state.search}
                  onChange={(e) => state.setSearch(e.target.value)}
                  className="pos-input w-full pl-10"
                />
              </div>
              <select
                value={state.typeFilter}
                onChange={(e) => state.setTypeFilter(e.target.value as any)}
                className="pos-input"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="vip">VIP</option>
              </select>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.balanceFilter}
                  onChange={(e) => state.setBalanceFilter(e.target.checked)}
                  className="rounded border-border"
                />
                Outstanding Balance
              </label>
            </div>

            {/* Customer Table */}
            <div className="pos-section overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-3 font-medium text-muted-foreground">Customer</th>
                    <th className="p-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                    <th className="p-3 font-medium text-muted-foreground text-center">Orders</th>
                    <th className="p-3 font-medium text-muted-foreground text-right hidden md:table-cell">Spent</th>
                    <th className="p-3 font-medium text-muted-foreground text-right">Balance</th>
                    <th className="p-3 font-medium text-muted-foreground hidden lg:table-cell">Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {state.customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => nav(`/customer/${c.id}`)}
                      className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.customerType === "vip" && (
                            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">VIP</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground sm:hidden">{c.phone}</span>
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{c.phone}</td>
                      <td className="p-3 text-center font-medium">{c.totalOrders}</td>
                      <td className="p-3 text-right font-medium hidden md:table-cell">${c.totalSpent.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        {c.outstandingBalance > 0 ? (
                          <span className="text-destructive font-semibold">${c.outstandingBalance.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{c.lastOrderDate ?? "—"}</td>
                    </tr>
                  ))}
                  {state.customers.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                      {state.search || state.typeFilter !== "all" || state.balanceFilter ? "No customers match your filters" : "No customers yet"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent, warning }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean; warning?: boolean }) {
  return (
    <div className="pos-section flex flex-col gap-1 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-xl font-bold ${accent ? "text-accent" : warning ? "text-destructive" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
