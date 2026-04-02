import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, TrendingUp, TrendingDown } from "lucide-react";
import { formatOMR } from "@/lib/currency";
import { printReport } from "@/lib/report-exports";
import { EXPENSE_CATEGORIES } from "@/lib/expense-queries";

const ALL_REPORT_CATEGORIES = [...EXPENSE_CATEGORIES, "Other"] as const;

interface IncomeStatementTabProps {
  data: {
    grossSales?: number;
    totalDiscounts?: number;
    laundrySales: number;
    totalRevenue: number;
    expensesByCategory: Record<string, number>;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    prevGrossSales?: number;
    prevTotalDiscounts?: number;
    prevRevenue: number;
    prevExpensesByCategory: Record<string, number>;
    prevTotalExpenses: number;
    prevNetProfit: number;
  };
  dateRangeLabel: string;
}

function Row({ label, amount, prevAmount, bold, indent, negative }: { label: string; amount: number; prevAmount?: number; bold?: boolean; indent?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? "font-bold" : ""} ${indent ? "pl-6" : ""}`}>
      <span className={`text-sm ${bold ? "" : "text-muted-foreground"}`}>{label}</span>
      <div className="flex items-center gap-6">
        {prevAmount !== undefined && (
          <span className="text-xs text-muted-foreground w-28 text-right">{formatOMR(prevAmount)}</span>
        )}
        <span className={`text-sm w-28 text-right ${negative ? "text-destructive" : ""} ${bold ? "text-base" : ""}`}>
          {amount < 0 ? `(${formatOMR(Math.abs(amount))})` : formatOMR(amount)}
        </span>
      </div>
    </div>
  );
}

export function IncomeStatementTab({ data, dateRangeLabel }: IncomeStatementTabProps) {
  const isLoss = data.netProfit < 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Income Statement</h2>
          <p className="text-xs text-muted-foreground">Period: {dateRangeLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => printReport("income-statement")}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <Card id="income-statement">
        <CardContent className="p-6 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold uppercase tracking-wider">LAVANDERIA</h3>
            <p className="text-xs text-muted-foreground">Income Statement — {dateRangeLabel}</p>
          </div>

          {/* REVENUE */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider pb-1">
              <span>Item</span>
              <div className="flex gap-6">
                <span className="w-28 text-right">Previous</span>
                <span className="w-28 text-right">Current</span>
              </div>
            </div>
            <Separator />
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1">Revenue</h4>
          <Row label="Laundry Sales" amount={data.laundrySales} prevAmount={data.prevRevenue} indent />
          <Separator />
          <Row label="Total Revenue" amount={data.totalRevenue} prevAmount={data.prevRevenue} bold />

          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-1">Expenses</h4>
          {[...new Set([...EXPENSE_CATEGORIES, ...Object.keys(data.expensesByCategory)])].map((cat) => {
            const amount = data.expensesByCategory[cat] || 0;
            const prev = data.prevExpensesByCategory[cat] || 0;
            if (amount === 0 && prev === 0) return null;
            return <Row key={cat} label={cat} amount={amount} prevAmount={prev} indent />;
          })}
          <Separator />
          <Row label="Total Expenses" amount={data.totalExpenses} prevAmount={data.prevTotalExpenses} bold />

          <Separator className="my-4" />

          {/* Result */}
          <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${isLoss ? "bg-destructive/5" : "bg-[hsl(142,72%,40%)]/5"}`}>
            <div className="flex items-center gap-2">
              {isLoss ? <TrendingDown className="h-5 w-5 text-destructive" /> : <TrendingUp className="h-5 w-5 text-[hsl(142,72%,40%)]" />}
              <span className="font-bold">{isLoss ? "Net Loss" : "Net Profit"}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-muted-foreground w-28 text-right">
                {data.prevNetProfit < 0 ? `(${formatOMR(Math.abs(data.prevNetProfit))})` : formatOMR(data.prevNetProfit)}
              </span>
              <span className={`font-bold text-base w-28 text-right ${isLoss ? "text-destructive" : "text-[hsl(142,72%,40%)]"}`}>
                {data.netProfit < 0 ? `(${formatOMR(Math.abs(data.netProfit))})` : formatOMR(data.netProfit)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 px-4">
            <span className="text-sm text-muted-foreground">Profit Margin</span>
            <span className={`font-semibold ${data.profitMargin >= 0 ? "text-[hsl(142,72%,40%)]" : "text-destructive"}`}>
              {data.profitMargin.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
