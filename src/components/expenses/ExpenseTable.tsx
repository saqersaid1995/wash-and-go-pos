import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, Bot } from "lucide-react";
import { formatOMR } from "@/lib/currency";
import type { Expense } from "@/lib/expense-queries";

interface ExpenseTableProps {
  expenses: Expense[];
  loading: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function ExpenseTable({ expenses, loading, onDelete, onStatusChange }: ExpenseTableProps) {
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
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-10"></TableHead>
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
