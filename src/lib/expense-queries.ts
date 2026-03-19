import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  is_recurring: boolean;
  recurring_period: string | null;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Loan",
  "Salaries",
  "Utilities",
  "Supplies",
  "Maintenance",
  "Fuel",
  "Other",
] as const;

export const RECURRING_PERIODS = ["Weekly", "Monthly", "Yearly"] as const;

export async function fetchAllExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  if (error) {
    console.error("fetchAllExpenses error:", error);
    return [];
  }
  return (data || []).map((r: any) => ({ ...r, amount: Number(r.amount) }));
}

export async function createExpense(params: {
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  is_recurring: boolean;
  recurring_period: string | null;
}) {
  const { error } = await supabase.from("expenses").insert(params);
  if (error) console.error("createExpense error:", error);
  return !error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) console.error("deleteExpense error:", error);
  return !error;
}
