import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/AppHeader";
import { Plus, Loader2, Receipt, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatOMR } from "@/lib/currency";
import {
  type Expense,
  EXPENSE_CATEGORIES,
  RECURRING_PERIODS,
  EXPENSE_STATUSES,
  fetchAllExpenses,
  createExpense,
  deleteExpense,
  updateExpenseStatus,
  triggerRecurringGeneration,
} from "@/lib/expense-queries";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { RecurringPreview } from "@/components/expenses/RecurringPreview";

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllExpenses();
    setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await triggerRecurringGeneration();
    setGenerating(false);
    if (result?.generated > 0) {
      toast.success(`Generated ${result.generated} recurring expense(s)`);
      await loadExpenses();
    } else {
      toast.info("No recurring expenses due today");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const ok = await updateExpenseStatus(id, status);
    if (ok) { toast.success("Status updated"); await loadExpenses(); }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteExpense(id);
    if (ok) { toast.success("Expense deleted"); await loadExpenses(); }
  };

  const totalExpenses = expenses.filter(e => !e.is_recurring || e.is_auto_generated).reduce((s, e) => s + e.amount, 0);
  const actualExpenses = expenses.filter(e => (!e.is_recurring || e.is_auto_generated) && e.expense_status === "paid");
  const accruedExpenses = expenses.filter(e => (!e.is_recurring || e.is_auto_generated) && e.expense_status === "accrued");
  const recurringTemplates = expenses.filter(e => e.is_recurring && !e.is_auto_generated);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Expenses" />

      <div className="p-4 max-w-[1200px] mx-auto space-y-6">
        {/* Add Expense Form */}
        <ExpenseForm onSaved={loadExpenses} />

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold">{formatOMR(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-xl font-bold text-[hsl(142,72%,40%)]">{actualExpenses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Accrued (Unpaid)</p>
              <p className="text-xl font-bold text-destructive">{accruedExpenses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Recurring Templates
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                </Button>
              </p>
              <p className="text-xl font-bold">{recurringTemplates.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Templates Preview */}
        {recurringTemplates.length > 0 && (
          <RecurringPreview templates={recurringTemplates} onChanged={loadExpenses} />
        )}

        {/* Expense List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Expense History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseTable
              expenses={expenses.filter(e => !e.is_recurring || e.is_auto_generated)}
              loading={loading}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Expenses;
