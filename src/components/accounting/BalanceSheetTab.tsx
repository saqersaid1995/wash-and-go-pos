import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatOMR } from "@/lib/currency";
import { buildBalanceSheet, type AccountBalance } from "@/lib/accounting-queries";
import { CheckCircle2, AlertTriangle } from "lucide-react";

function Section({ title, accounts, total }: { title: string; accounts: AccountBalance[]; total: number }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="space-y-1">
        {accounts.length === 0 && <div className="text-xs text-muted-foreground italic px-2">No balances</div>}
        {accounts.filter((a) => Math.abs(a.balance) > 0.001).map((a) => (
          <div key={a.id} className="flex justify-between items-center px-2 py-1.5 rounded hover:bg-muted/50 text-sm">
            <span className="text-muted-foreground"><span className="font-mono text-xs mr-2">{a.code}</span>{a.account_name}</span>
            <span className="font-medium tabular-nums">{formatOMR(a.balance)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center px-2 py-2 border-t font-semibold">
        <span>Total {title}</span>
        <span className="tabular-nums">{formatOMR(total)}</span>
      </div>
    </div>
  );
}

export function BalanceSheetTab({ balances }: { balances: AccountBalance[] }) {
  const bs = useMemo(() => buildBalanceSheet(balances), [balances]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Balance Sheet</span>
            {bs.isBalanced ? (
              <Badge className="bg-success/10 text-success border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Balanced</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Off by {formatOMR(Math.abs(bs.difference))}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Assets */}
          <Section title="Assets" accounts={bs.assets} total={bs.totalAssets} />

          {/* Right: Liabilities + Equity */}
          <div className="space-y-6">
            <Section title="Liabilities" accounts={bs.liabilities} total={bs.totalLiabilities} />
            <div>
              <Section title="Equity" accounts={bs.equity} total={bs.totalEquity - bs.retainedEarningsCalc} />
              <div className="flex justify-between items-center px-2 py-1.5 rounded text-sm mt-1">
                <span className="text-muted-foreground italic">Net Income (current period)</span>
                <span className="font-medium tabular-nums">{formatOMR(bs.retainedEarningsCalc)}</span>
              </div>
              <div className="flex justify-between items-center px-2 py-2 border-t font-semibold mt-1">
                <span>Total Equity</span>
                <span className="tabular-nums">{formatOMR(bs.totalEquity)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center px-2 py-2 border-t-2 border-foreground/20 font-bold text-base">
              <span>Liabilities + Equity</span>
              <span className="tabular-nums">{formatOMR(bs.totalLiabilities + bs.totalEquity)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
