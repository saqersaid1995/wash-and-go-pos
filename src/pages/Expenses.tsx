import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/AppHeader";
import { Plus, Trash2, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatOMR } from "@/lib/currency";
import {
  type Expense,
  EXPENSE_CATEGORIES,
  RECURRING_PERIODS,
  fetchAllExpenses,
  createExpense,
  deleteExpense,
} from "@/lib/expense-queries";

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Other");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState<string>("Monthly");

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllExpenses();
    setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const finalCategory = category === "Custom" ? customCategory.trim() : category;
    if (!finalCategory) { toast.error("Select or enter a category"); return; }

    setSaving(true);
    const ok = await createExpense({
      expense_date: date,
      category: finalCategory,
      description: description.trim(),
      amount: amt,
      is_recurring: isRecurring,
      recurring_period: isRecurring ? recurringPeriod : null,
    });
    setSaving(false);

    if (ok) {
      toast.success("Expense recorded");
      setDescription("");
      setAmount("");
      setIsRecurring(false);
      await loadExpenses();
    } else {
      toast.error("Failed to save expense");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteExpense(id);
    if (ok) { toast.success("Expense deleted"); await loadExpenses(); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <h1 className="text-lg font-bold tracking-tight">Expense Management</h1>
          <div className="flex items-center gap-3">
            <NavLink to="/">POS</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            <NavLink to="/workflow">Workflow</NavLink>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-[1200px] mx-auto space-y-6">
        {/* Add Expense Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Record Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="Custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {category === "Custom" && (
                  <Input placeholder="Custom category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="mt-1.5" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="e.g. Monthly rent" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (OMR)</Label>
                <Input type="number" step="0.001" min="0" placeholder="0.000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                <Label>Recurring</Label>
                {isRecurring && (
                  <Select value={recurringPeriod} onValueChange={setRecurringPeriod}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECURRING_PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Expense
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold">{formatOMR(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Records</p>
              <p className="text-xl font-bold">{expenses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Recurring</p>
              <p className="text-xl font-bold">{expenses.filter((e) => e.is_recurring).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Expense List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Expense History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No expenses recorded yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Recurring</TableHead>
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
                        {exp.is_recurring ? (
                          <Badge variant="outline" className="text-xs">{exp.recurring_period}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(exp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Expenses;
