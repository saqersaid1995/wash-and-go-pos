import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, TrendingUp, TrendingDown } from "lucide-react";
import { formatOMR } from "@/lib/currency";
import { EXPENSE_CATEGORIES } from "@/lib/expense-queries";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

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
    <div className={`is-row flex items-center justify-between py-2 ${bold ? "font-bold" : ""} ${indent ? "pl-6" : ""}`}>
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

async function exportPDF(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  toast.info("Generating PDF…");
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    const A4W = 210;
    const margin = 15;
    const contentW = A4W - margin * 2;
    const imgH = (canvas.height * contentW) / canvas.width;
    pdf.addImage(imgData, "PNG", margin, margin, contentW, imgH);
    pdf.save(filename);
    toast.success("PDF downloaded");
  } catch {
    toast.error("PDF export failed");
  }
}

function handlePrint(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Income Statement</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 30px 40px; color: #1a1a1a; font-size: 13px; }
      .is-header { text-align: center; margin-bottom: 24px; }
      .is-header h3 { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
      .is-header p { font-size: 11px; color: #666; }
      .is-section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-top: 20px; margin-bottom: 6px; }
      .is-col-header { display: flex; justify-content: space-between; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; padding-bottom: 6px; border-bottom: 2px solid #222; margin-bottom: 4px; }
      .is-col-header .is-amounts { display: flex; gap: 24px; }
      .is-col-header span.is-amt-col { width: 110px; text-align: right; }
      .is-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
      .is-row.is-indent { padding-left: 24px; }
      .is-row.is-bold { font-weight: 700; }
      .is-row .is-label { flex: 1; }
      .is-row .is-amounts { display: flex; gap: 24px; }
      .is-row .is-amt-col { width: 110px; text-align: right; font-variant-numeric: tabular-nums; }
      .is-row.is-negative .is-current { color: #dc2626; }
      .is-separator { border: none; border-top: 1px solid #ddd; margin: 4px 0; }
      .is-separator-bold { border: none; border-top: 2px solid #222; margin: 12px 0; }
      .is-result { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 6px; margin-top: 8px; }
      .is-result.is-profit { background: #f0fdf4; }
      .is-result.is-loss { background: #fef2f2; }
      .is-result .is-label { font-weight: 700; font-size: 14px; }
      .is-result .is-amounts { display: flex; gap: 24px; }
      .is-result .is-amt-col { width: 110px; text-align: right; font-weight: 700; font-size: 14px; }
      .is-result.is-profit .is-current { color: #16a34a; }
      .is-result.is-loss .is-current { color: #dc2626; }
      .is-margin { display: flex; justify-content: space-between; padding: 8px 16px; margin-top: 8px; }
      .is-margin .is-label { color: #666; font-size: 13px; }
      .is-margin .is-value { font-weight: 600; }
      .is-margin .is-value.is-positive { color: #16a34a; }
      .is-margin .is-value.is-negative { color: #dc2626; }
      @page { margin: 15mm; }
    </style></head><body>
  `);
  // Build structured HTML for print
  const clone = el.cloneNode(true) as HTMLElement;
  win.document.write(clone.innerHTML);
  win.document.write("</body></html>");
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export function IncomeStatementTab({ data, dateRangeLabel }: IncomeStatementTabProps) {
  const isLoss = data.netProfit < 0;
  const hasDiscounts = (data.grossSales ?? 0) > 0 && (data.totalDiscounts ?? 0) > 0;

  const expenseCategories = [...new Set([...EXPENSE_CATEGORIES, ...Object.keys(data.expensesByCategory)])].filter(
    (cat) => (data.expensesByCategory[cat] || 0) !== 0 || (data.prevExpensesByCategory[cat] || 0) !== 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold">Income Statement</h2>
          <p className="text-xs text-muted-foreground">Period: {dateRangeLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePrint("income-statement")}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF("income-statement", `income-statement-${dateRangeLabel.replace(/\s/g, "-")}.pdf`)}>
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      <Card id="income-statement" className="print:shadow-none print:border-none">
        <CardContent className="p-6 max-w-2xl mx-auto">
          {/* Print-friendly structured layout */}
          <div className="is-header text-center mb-6">
            <h3 className="text-lg font-bold uppercase tracking-wider">LAVANDERIA</h3>
            <p className="text-xs text-muted-foreground">Income Statement — {dateRangeLabel}</p>
          </div>

          {/* Column headers */}
          <div className="is-col-header">
            <div className="flex justify-between w-full text-xs text-muted-foreground uppercase tracking-wider pb-1">
              <span>Item</span>
              <div className="is-amounts flex gap-6">
                <span className="is-amt-col w-28 text-right">Previous</span>
                <span className="is-amt-col w-28 text-right">Current</span>
              </div>
            </div>
          </div>
          <Separator />

          {/* REVENUE */}
          <h4 className="is-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1">Revenue</h4>
          {hasDiscounts ? (
            <>
              <div className="is-row is-indent"><Row label="Gross Sales" amount={data.grossSales!} prevAmount={data.prevGrossSales} indent /></div>
              <div className="is-row is-indent is-negative"><Row label="Sales Discounts" amount={-(data.totalDiscounts!)} prevAmount={data.prevTotalDiscounts ? -data.prevTotalDiscounts : 0} indent negative /></div>
              <Separator />
              <div className="is-row is-bold"><Row label="Net Revenue" amount={data.totalRevenue} prevAmount={data.prevRevenue} bold /></div>
            </>
          ) : (
            <>
              <div className="is-row is-indent"><Row label="Laundry Sales" amount={data.laundrySales} prevAmount={data.prevRevenue} indent /></div>
              <Separator />
              <div className="is-row is-bold"><Row label="Total Revenue" amount={data.totalRevenue} prevAmount={data.prevRevenue} bold /></div>
            </>
          )}

          {/* EXPENSES */}
          <h4 className="is-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-1">Expenses</h4>
          {expenseCategories.map((cat) => (
            <div key={cat} className="is-row is-indent">
              <Row label={cat} amount={data.expensesByCategory[cat] || 0} prevAmount={data.prevExpensesByCategory[cat] || 0} indent />
            </div>
          ))}
          <Separator />
          <div className="is-row is-bold"><Row label="Total Expenses" amount={data.totalExpenses} prevAmount={data.prevTotalExpenses} bold /></div>

          <Separator className="my-4 is-separator-bold" />

          {/* Result */}
          <div className={`is-result flex items-center justify-between py-3 px-4 rounded-lg ${isLoss ? "is-loss bg-destructive/5" : "is-profit bg-[hsl(142,72%,40%)]/5"}`}>
            <div className="flex items-center gap-2">
              {isLoss ? <TrendingDown className="h-5 w-5 text-destructive print:hidden" /> : <TrendingUp className="h-5 w-5 text-[hsl(142,72%,40%)] print:hidden" />}
              <span className="is-label font-bold">{isLoss ? "Net Loss" : "Net Profit"}</span>
            </div>
            <div className="is-amounts flex items-center gap-6">
              <span className="is-amt-col text-xs text-muted-foreground w-28 text-right">
                {data.prevNetProfit < 0 ? `(${formatOMR(Math.abs(data.prevNetProfit))})` : formatOMR(data.prevNetProfit)}
              </span>
              <span className={`is-amt-col is-current font-bold text-base w-28 text-right ${isLoss ? "text-destructive" : "text-[hsl(142,72%,40%)]"}`}>
                {data.netProfit < 0 ? `(${formatOMR(Math.abs(data.netProfit))})` : formatOMR(data.netProfit)}
              </span>
            </div>
          </div>

          <div className="is-margin flex items-center justify-between mt-3 px-4">
            <span className="is-label text-sm text-muted-foreground">Profit Margin</span>
            <span className={`is-value font-semibold ${data.profitMargin >= 0 ? "is-positive text-[hsl(142,72%,40%)]" : "is-negative text-destructive"}`}>
              {data.profitMargin.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}