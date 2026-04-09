import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  is_recurring: boolean;
  recurring_period: string | null;
  billing_day: number | null;
  next_run_date: string | null;
  last_run_date: string | null;
  expense_status: string;
  is_auto_generated: boolean;
  parent_recurring_id: string | null;
  payment_source: string;
  cash_amount: number;
  bank_amount: number;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_SOURCES = ["cash", "bank", "mixed"] as const;

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Fuel",
  "Loan",
  "Other",
] as const;

export const RECURRING_PERIODS = ["Weekly", "Monthly", "Yearly"] as const;

export const EXPENSE_STATUSES = ["paid", "accrued"] as const;

export async function fetchAllExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  if (error) {
    console.error("fetchAllExpenses error:", error);
    return [];
  }
  return (data || []).map((r: any) => ({ ...r, amount: Number(r.amount), cash_amount: Number(r.cash_amount), bank_amount: Number(r.bank_amount) }));
}

export async function fetchRecurringTemplates(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("is_recurring", true)
    .eq("is_auto_generated", false)
    .order("category", { ascending: true });

  if (error) {
    console.error("fetchRecurringTemplates error:", error);
    return [];
  }
  return (data || []).map((r: any) => ({ ...r, amount: Number(r.amount), cash_amount: Number(r.cash_amount), bank_amount: Number(r.bank_amount) }));
}

export async function createExpense(params: {
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  is_recurring: boolean;
  recurring_period: string | null;
  billing_day?: number | null;
  next_run_date?: string | null;
  expense_status?: string;
  payment_source: string;
  cash_amount: number;
  bank_amount: number;
}) {
  const insertData: any = { ...params };
  
  // Calculate next_run_date for recurring expenses
  if (params.is_recurring && params.billing_day) {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const day = Math.min(params.billing_day, maxDay);
    nextMonth.setDate(day);
    insertData.next_run_date = nextMonth.toISOString().split("T")[0];
  }

  const { error } = await supabase.from("expenses").insert(insertData);
  if (error) console.error("createExpense error:", error);
  return !error;
}

export async function updateExpenseStatus(id: string, status: string) {
  const { error } = await supabase
    .from("expenses")
    .update({ expense_status: status })
    .eq("id", id);
  if (error) console.error("updateExpenseStatus error:", error);
  return !error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) console.error("deleteExpense error:", error);
  return !error;
}

export async function triggerRecurringGeneration() {
  const { data, error } = await supabase.functions.invoke("generate-recurring-expenses");
  if (error) console.error("triggerRecurringGeneration error:", error);
  return data;
}
