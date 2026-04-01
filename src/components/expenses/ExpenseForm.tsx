import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORIES,
  RECURRING_PERIODS,
  EXPENSE_STATUSES,
  createExpense,
} from "@/lib/expense-queries";

interface ExpenseFormProps {
  onSaved: () => Promise<void>;
}

export function ExpenseForm({ onSaved }: ExpenseFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Other");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState<string>("Monthly");
  const [billingDay, setBillingDay] = useState<string>("1");
  const [expenseStatus, setExpenseStatus] = useState<string>("paid");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const finalCategory = category === "Custom" ? customCategory.trim() : category;
    if (!finalCategory) { toast.error("Select or enter a category"); return; }

    if (isRecurring && recurringPeriod === "Monthly") {
      const day = parseInt(billingDay);
      if (isNaN(day) || day < 1 || day > 31) {
        toast.error("Billing day must be between 1 and 31");
        return;
      }
    }

    setSaving(true);
    const ok = await createExpense({
      expense_date: date,
      category: finalCategory,
      description: description.trim(),
      amount: amt,
      is_recurring: isRecurring,
      recurring_period: isRecurring ? recurringPeriod : null,
      billing_day: isRecurring ? parseInt(billingDay) || 1 : null,
      expense_status: expenseStatus,
    });
    setSaving(false);

    if (ok) {
      toast.success("Expense recorded");
      setDescription("");
      setAmount("");
      setIsRecurring(false);
      setExpenseStatus("paid");
      await onSaved();
    } else {
      toast.error("Failed to save expense");
    }
  };

  const ordinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> Record Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={expenseStatus} onValueChange={setExpenseStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="accrued">Accrued (Due, not paid)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
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

            {isRecurring && (
              <div className="space-y-1.5">
                <Label>Billing Day (1–31)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  placeholder="1"
                />
              </div>
            )}

            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Expense
              </Button>
            </div>
          </div>

          {/* Recurring preview */}
          {isRecurring && billingDay && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>
                This expense will be generated every <strong>{ordinalSuffix(parseInt(billingDay) || 1)}</strong> day of the {recurringPeriod === "Weekly" ? "week" : recurringPeriod === "Yearly" ? "year" : "month"} as an accrued expense.
              </span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
