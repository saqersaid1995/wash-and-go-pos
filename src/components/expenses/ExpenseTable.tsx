import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, Bot, Pencil } from "lucide-react";
import { formatOMR } from "@/lib/currency";
import { type Expense, PL_LINES } from "@/lib/expense-queries";

interface ExpenseTableProps {
  expenses: Expense[];
  loading: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (expense: Expense) => void;
}

const PL_LABEL: Record<string, string> = Object.fromEntries(PL_LINES.map((l) => [l.value, l.label]));

function sourceBadge(source: string) {
  switch (source) {
    case "cash": return <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">Cash</Badge>;
    case "bank": return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Bank</Badge>;
    case "mixed": return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">Mixed</Badge>;
    default: return <Badge variant="outline" className="text-xs">{source}</Badge>;
  }
}

export function ExpenseTable({ expenses, loading, onDelete, onStatusChange, onEdit }: ExpenseTableProps) {
  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (expenses.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No expenses recorded yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Payment Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>P&amp;L Mapping</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((exp) => (
            <TableRow key={exp.id}>
              <TableCell className="text-xs">{exp.expense_date}</TableCell>
              <TableCell><Badge variant="secondary">{exp.category}</Badge></TableCell>
              <TableCell className="text-sm">{exp.description || "—"}</TableCell>
              <TableCell className="text-right font-semibold">{formatOMR(exp.amount)}</TableCell>
              <TableCell>
                {sourceBadge(exp.payment_source || "cash")}
                {exp.payment_source === "mixed" && (
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    C: {formatOMR(exp.cash_amount)} / B: {formatOMR(exp.bank_amount)}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Select value={exp.expense_status} onValueChange={(v) => onStatusChange(exp.id, v)}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">
                      <span className="text-[hsl(142,72%,40%)]">Paid</span>
                    </SelectItem>
                    <SelectItem value="accrued">
                      <span className="text-destructive">Accrued</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {exp.is_auto_generated ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Bot className="h-3 w-3" /> Auto
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Manual</span>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(exp.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
