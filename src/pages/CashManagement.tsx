import { useState, useMemo, useEffect, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wallet, Banknote, Building2, ArrowDownCircle, ArrowUpCircle,
  Scale, CalendarClock, TrendingUp, TrendingDown, Save, Pencil,
} from "lucide-react";
import { formatOMR } from "@/lib/currency";
import { cn, toLocalDateStr } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllExpenses, type Expense } from "@/lib/expense-queries";
import { toast } from "sonner";

interface OpeningBalance {
  id?: string;
  account_type: "cash" | "bank";
  amount: number;
  as_of_date: string;
  notes?: string;
}

type RangePreset = "this-month" | "last-month" | "last-3-months" | "this-year" | "all";

interface PaymentRow {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
}

const toDateStr = (d: Date) => toLocalDateStr(d);

function getRangeBounds(preset: RangePreset): [string, string] | null {
  const today = toDateStr(new Date());
  const d = new Date();
  switch (preset) {
    case "this-month": { const s = new Date(); s.setDate(1); return [toDateStr(s), today]; }
    case "last-month": {
      const s = new Date(); s.setMonth(s.getMonth() - 1, 1);
      const e = new Date(); e.setDate(0);
      return [toDateStr(s), toDateStr(e)];
    }
    case "last-3-months": { const s = new Date(); s.setMonth(s.getMonth() - 3); return [toDateStr(s), today]; }
    case "this-year": return [`${d.getFullYear()}-01-01`, today];
    case "all": return null;
  }
}

export default function CashManagement() {
  const [preset, setPreset] = useState<RangePreset>("this-month");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualBank, setActualBank] = useState<string>("");

  const bounds = useMemo(() => getRangeBounds(preset), [preset]);

  const loadData = useCallback(async () => {
    setLoading(true);
    // Load ALL payments (for full-time cash position) and filtered for summary view
    const [{ data: payData }, allExpenses] = await Promise.all([
      supabase.from("payments").select("id, amount, payment_date, payment_method").order("payment_date", { ascending: false }),
      fetchAllExpenses(),
    ]);
    const mapped: PaymentRow[] = (payData || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      payment_date: p.payment_date,
      payment_method: p.payment_method,
    }));
    setPayments(mapped);
    setExpenses(allExpenses);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ========== CASH POSITION (lifetime, all-time) ==========
  const cashPosition = useMemo(() => {
    // Inflows by source
    let cashIn = 0, bankIn = 0;
    payments.forEach((p) => {
      if (p.payment_method === "cash") cashIn += p.amount;
      else bankIn += p.amount; // card + bank-transfer = bank
    });
    // Outflows: only PAID expenses
    let cashOut = 0, bankOut = 0;
    expenses.forEach((e) => {
      if (e.expense_status !== "paid") return;
      if (e.payment_source === "cash") cashOut += e.amount;
      else if (e.payment_source === "bank") bankOut += e.amount;
      else if (e.payment_source === "mixed") {
        cashOut += Number(e.cash_amount || 0);
        bankOut += Number(e.bank_amount || 0);
      }
    });
    const cashBalance = cashIn - cashOut;
    const bankBalance = bankIn - bankOut;
    return { cashIn, bankIn, cashOut, bankOut, cashBalance, bankBalance, total: cashBalance + bankBalance };
  }, [payments, expenses]);

  // ========== PERIOD-FILTERED INFLOWS / OUTFLOWS ==========
  const periodPayments = useMemo(() => {
    if (!bounds) return payments;
    return payments.filter((p) => {
      const d = p.payment_date.slice(0, 10);
      return d >= bounds[0] && d <= bounds[1];
    });
  }, [payments, bounds]);

  const periodExpenses = useMemo(() => {
    if (!bounds) return expenses;
    return expenses.filter((e) => e.expense_date >= bounds[0] && e.expense_date <= bounds[1]);
  }, [expenses, bounds]);

  const summary = useMemo(() => {
    const inflows = periodPayments.reduce((s, p) => s + p.amount, 0);
    const paidExpenses = periodExpenses.filter((e) => e.expense_status === "paid");
    const outflows = paidExpenses.reduce((s, e) => s + e.amount, 0);
    return { inflows, outflows, net: inflows - outflows };
  }, [periodPayments, periodExpenses]);

  // ========== DAILY MOVEMENT TABLE ==========
  const dailyMovements = useMemo(() => {
    const map: Record<string, { cashIn: number; cashOut: number; bankIn: number; bankOut: number }> = {};
    const ensure = (d: string) => {
      if (!map[d]) map[d] = { cashIn: 0, cashOut: 0, bankIn: 0, bankOut: 0 };
      return map[d];
    };
    periodPayments.forEach((p) => {
      const d = p.payment_date.slice(0, 10);
      const row = ensure(d);
      if (p.payment_method === "cash") row.cashIn += p.amount;
      else row.bankIn += p.amount;
    });
    periodExpenses.forEach((e) => {
      if (e.expense_status !== "paid") return;
      const row = ensure(e.expense_date);
      if (e.payment_source === "cash") row.cashOut += e.amount;
      else if (e.payment_source === "bank") row.bankOut += e.amount;
      else if (e.payment_source === "mixed") {
        row.cashOut += Number(e.cash_amount || 0);
        row.bankOut += Number(e.bank_amount || 0);
      }
    });
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    let runningCash = 0, runningBank = 0;
    return sorted.map(([date, v]) => {
      runningCash += v.cashIn - v.cashOut;
      runningBank += v.bankIn - v.bankOut;
      return { date, ...v, runningCash, runningBank, runningTotal: runningCash + runningBank };
    }).reverse(); // newest first for display
  }, [periodPayments, periodExpenses]);

  // ========== RECONCILIATION ==========
  const reconciliation = useMemo(() => {
    const actual = parseFloat(actualBank);
    if (isNaN(actual)) return null;
    const diff = actual - cashPosition.bankBalance;
    return { actual, system: cashPosition.bankBalance, diff };
  }, [actualBank, cashPosition.bankBalance]);

  // ========== FUTURE PAYMENTS ==========
  const futurePayments = useMemo(() => {
    const today = toDateStr(new Date());
    const upcoming = expenses.filter((e) => {
      // Recurring with a next_run_date in the future
      if (e.is_recurring && e.next_run_date && e.next_run_date >= today) return true;
      // One-off pending/scheduled expenses with date >= today
      if (e.expense_status !== "paid" && e.expense_date >= today) return true;
      return false;
    }).map((e) => ({
      id: e.id,
      date: e.is_recurring && e.next_run_date ? e.next_run_date : e.expense_date,
      description: e.description || e.category,
      category: e.category,
      amount: e.amount,
      recurring: e.is_recurring,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const totalUpcoming = upcoming.reduce((s, x) => s + x.amount, 0);
    const remainingAfter = cashPosition.total - totalUpcoming;
    return { list: upcoming, totalUpcoming, remainingAfter };
  }, [expenses, cashPosition.total]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Cash Management" subtitle="Cash position, movement & reconciliation" />

      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-6">
        {/* Range filter */}
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Period for movements & summary:</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 1. Cash Position (lifetime) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" /> Cash Position <span className="text-xs text-muted-foreground font-normal">(lifetime)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PositionCard
                label="Cash Balance"
                value={cashPosition.cashBalance}
                icon={<Banknote className="h-5 w-5" />}
                tone="success"
              />
              <PositionCard
                label="Bank Balance"
                value={cashPosition.bankBalance}
                icon={<Building2 className="h-5 w-5" />}
                tone="primary"
              />
              <PositionCard
                label="Total Balance"
                value={cashPosition.total}
                icon={<Wallet className="h-5 w-5" />}
                tone="accent"
                highlight
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Cashflow Summary (period) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Cashflow Summary <span className="text-xs text-muted-foreground font-normal">(selected period)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                label="Total Inflows (Sales)"
                value={summary.inflows}
                icon={<ArrowDownCircle className="h-5 w-5" />}
                tone="success"
              />
              <SummaryCard
                label="Total Outflows (Expenses)"
                value={summary.outflows}
                icon={<ArrowUpCircle className="h-5 w-5" />}
                tone="destructive"
              />
              <SummaryCard
                label="Net Cashflow"
                value={summary.net}
                icon={summary.net >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                tone={summary.net >= 0 ? "success" : "destructive"}
                highlight
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Daily Movement Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right text-success">Cash In</TableHead>
                    <TableHead className="text-right text-destructive">Cash Out</TableHead>
                    <TableHead className="text-right text-success">Bank In</TableHead>
                    <TableHead className="text-right text-destructive">Bank Out</TableHead>
                    <TableHead className="text-right font-bold">Running Cash</TableHead>
                    <TableHead className="text-right font-bold">Running Bank</TableHead>
                    <TableHead className="text-right font-bold">Running Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
                  )}
                  {!loading && dailyMovements.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No movements in this period</TableCell></TableRow>
                  )}
                  {dailyMovements.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-right text-success">{row.cashIn > 0 ? formatOMR(row.cashIn) : "—"}</TableCell>
                      <TableCell className="text-right text-destructive">{row.cashOut > 0 ? formatOMR(row.cashOut) : "—"}</TableCell>
                      <TableCell className="text-right text-success">{row.bankIn > 0 ? formatOMR(row.bankIn) : "—"}</TableCell>
                      <TableCell className="text-right text-destructive">{row.bankOut > 0 ? formatOMR(row.bankOut) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatOMR(row.runningCash)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatOMR(row.runningBank)}</TableCell>
                      <TableCell className={cn("text-right font-bold", row.runningTotal >= 0 ? "text-foreground" : "text-destructive")}>
                        {formatOMR(row.runningTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 4. Reconciliation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" /> Bank Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Actual Bank Balance</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Enter your bank statement balance"
                  value={actualBank}
                  onChange={(e) => setActualBank(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">System Bank Balance</Label>
                <div className="mt-1 h-10 flex items-center px-3 rounded-md border bg-muted/30 font-semibold">
                  {formatOMR(cashPosition.bankBalance)}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Difference</Label>
                <div className={cn(
                  "mt-1 h-10 flex items-center px-3 rounded-md border font-bold",
                  reconciliation
                    ? Math.abs(reconciliation.diff) < 0.001
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-muted/30 text-muted-foreground"
                )}>
                  {reconciliation ? (
                    <>
                      {reconciliation.diff >= 0 ? "+" : ""}{formatOMR(reconciliation.diff)}
                      {Math.abs(reconciliation.diff) < 0.001 && (
                        <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/30">Reconciled ✓</Badge>
                      )}
                    </>
                  ) : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Future Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Future Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Current Total Balance</p>
                <p className="text-lg font-bold">{formatOMR(cashPosition.total)}</p>
              </div>
              <div className="rounded-lg border bg-warning/10 border-warning/30 p-3">
                <p className="text-xs text-muted-foreground">Total Upcoming Outflows</p>
                <p className="text-lg font-bold text-warning">{formatOMR(futurePayments.totalUpcoming)}</p>
              </div>
              <div className={cn(
                "rounded-lg border p-3",
                futurePayments.remainingAfter >= 0
                  ? "bg-success/10 border-success/30"
                  : "bg-destructive/10 border-destructive/30"
              )}>
                <p className="text-xs text-muted-foreground">Remaining After Payments</p>
                <p className={cn("text-lg font-bold", futurePayments.remainingAfter >= 0 ? "text-success" : "text-destructive")}>
                  {formatOMR(futurePayments.remainingAfter)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {futurePayments.list.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No upcoming payments scheduled</TableCell></TableRow>
                  )}
                  {futurePayments.list.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.date}</TableCell>
                      <TableCell>{p.description || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                      <TableCell>
                        {p.recurring
                          ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Recurring</Badge>
                          : <Badge variant="outline">One-off</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{formatOMR(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PositionCard({ label, value, icon, tone, highlight }: {
  label: string; value: number; icon: React.ReactNode;
  tone: "success" | "primary" | "accent"; highlight?: boolean;
}) {
  const toneClasses = {
    success: "bg-success/10 text-success border-success/30",
    primary: "bg-primary/10 text-primary border-primary/30",
    accent: "bg-accent/20 text-foreground border-accent/40",
  }[tone];
  const negative = value < 0;
  return (
    <div className={cn("rounded-lg border p-4 flex items-center justify-between", highlight && "ring-2 ring-primary/20", toneClasses)}>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className={cn("text-2xl font-bold mt-1", negative && "text-destructive")}>{formatOMR(value)}</p>
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone, highlight }: {
  label: string; value: number; icon: React.ReactNode;
  tone: "success" | "destructive"; highlight?: boolean;
}) {
  const toneClasses = {
    success: "bg-success/10 text-success border-success/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-4 flex items-center justify-between", highlight && "ring-2 ring-primary/20", toneClasses)}>
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold mt-1">{formatOMR(value)}</p>
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  );
}
