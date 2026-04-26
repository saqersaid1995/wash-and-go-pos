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
  income_category: IncomeCategory;
  pl_line: PLLine;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_SOURCES = ["cash", "bank", "mixed"] as const;

// Legacy income category type (kept for backward compatibility with existing UI)
export type IncomeCategory =
  | "cogs" | "salaries" | "rent" | "utilities" | "marketing"
  | "other_opex" | "depreciation" | "interest" | "non_operating";

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string; group: "cogs" | "opex" | "below_ebitda" | "non_op" }[] = [
  { value: "cogs", label: "COGS (Cost of Sales)", group: "cogs" },
  { value: "salaries", label: "Salaries (OPEX)", group: "opex" },
  { value: "rent", label: "Rent (OPEX)", group: "opex" },
  { value: "utilities", label: "Utilities (OPEX)", group: "opex" },
  { value: "marketing", label: "Marketing (OPEX)", group: "opex" },
  { value: "other_opex", label: "Other OPEX", group: "opex" },
  { value: "depreciation", label: "Depreciation", group: "below_ebitda" },
  { value: "interest", label: "Interest", group: "below_ebitda" },
  { value: "non_operating", label: "Non-operating Income/Expense", group: "non_op" },
];

export function autoMapIncomeCategory(category: string): IncomeCategory {
  switch (category) {
    case "Salaries": return "salaries";
    case "Rent": return "rent";
    case "Utilities": return "utilities";
    case "Marketing": return "marketing";
    case "Loan": return "interest";
    case "Supplies": return "cogs";
    default: return "other_opex";
  }
}

// === Income Statement P&L Line (manual mapping, required) ===
// These are the EXACT line items from the company's Income Statement format.
// Calculated rows (Gross Profit, EBITDA, EBIT, Net Profit, Cash Profit) are NOT included
// because they are derived automatically.
export type PLLine =
  | "revenue"
  | "cogs"
  | "sga_admin"
  | "other_operating_income"
  | "depreciation"
  | "interest_expense"
  | "interest_income"
  | "other_income"
  | "tax_provision";

export const PL_LINES: { value: PLLine; label: string; group: "revenue" | "cogs" | "opex" | "operating_income" | "below_ebitda" | "non_op" | "tax" }[] = [
  { value: "revenue", label: "Gross Sales / Revenue", group: "revenue" },
  { value: "cogs", label: "Cost of Goods Sold", group: "cogs" },
  { value: "sga_admin", label: "S, G & A including depreciation - admin", group: "opex" },
  { value: "other_operating_income", label: "Other Operating Income", group: "operating_income" },
  { value: "depreciation", label: "Depreciation / Amortization - total", group: "below_ebitda" },
  { value: "interest_expense", label: "Interest Expenses", group: "below_ebitda" },
  { value: "interest_income", label: "Interest Income", group: "non_op" },
  { value: "other_income", label: "Other Income", group: "non_op" },
  { value: "tax_provision", label: "Provision for Tax", group: "tax" },
];

export function suggestPLLine(category: string): PLLine {
  switch (category) {
    case "Loan": return "interest_expense";
    case "Supplies": return "cogs";
    // Salaries / Rent / Utilities / Maintenance / Marketing / Fuel / Other -> SG&A admin
    default: return "sga_admin";
  }
}

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
  income_category?: IncomeCategory;
  pl_line: PLLine;
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

export async function updateExpense(id: string, updates: Partial<{
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  is_recurring: boolean;
  recurring_period: string | null;
  billing_day: number | null;
  next_run_date: string | null;
  expense_status: string;
  payment_source: string;
  cash_amount: number;
  bank_amount: number;
  income_category: IncomeCategory;
  pl_line: PLLine;
}>) {
  const patch: any = { ...updates };
  // Recompute next_run_date when billing_day changes for recurring templates
  if (updates.billing_day) {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const day = Math.min(updates.billing_day, maxDay);
    nextMonth.setDate(day);
    patch.next_run_date = nextMonth.toISOString().split("T")[0];
  }
  const { error } = await supabase.from("expenses").update(patch).eq("id", id);
  if (error) console.error("updateExpense error:", error);
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
