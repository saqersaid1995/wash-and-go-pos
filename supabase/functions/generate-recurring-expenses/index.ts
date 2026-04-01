import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentDay = today.getDate();

    // Fetch all recurring expenses that are due
    const { data: recurring, error: fetchErr } = await supabase
      .from("expenses")
      .select("*")
      .eq("is_recurring", true)
      .eq("is_auto_generated", false)
      .not("billing_day", "is", null);

    if (fetchErr) throw fetchErr;

    let generated = 0;

    for (const rec of recurring || []) {
      // Check if next_run_date is today or in the past
      if (rec.next_run_date && rec.next_run_date > todayStr) continue;

      // If no next_run_date, check billing_day matches today
      if (!rec.next_run_date && rec.billing_day !== currentDay) continue;

      // Check if already generated for this month
      const monthStart = `${todayStr.slice(0, 7)}-01`;
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("parent_recurring_id", rec.id)
        .gte("expense_date", monthStart)
        .lte("expense_date", todayStr)
        .limit(1);

      if (existing && existing.length > 0) {
        // Already generated this month, advance next_run_date
        const nextDate = calcNextRunDate(rec.billing_day, rec.recurring_period, todayStr);
        await supabase.from("expenses").update({
          next_run_date: nextDate,
          last_run_date: todayStr,
        }).eq("id", rec.id);
        continue;
      }

      // Generate the expense record
      const { error: insertErr } = await supabase.from("expenses").insert({
        expense_date: todayStr,
        category: rec.category,
        description: `${rec.description || rec.category} (auto-generated)`,
        amount: rec.amount,
        is_recurring: false,
        recurring_period: null,
        is_auto_generated: true,
        parent_recurring_id: rec.id,
        expense_status: "accrued",
      });

      if (insertErr) {
        console.error(`Failed to generate expense for ${rec.id}:`, insertErr);
        continue;
      }

      // Update parent recurring expense
      const nextDate = calcNextRunDate(rec.billing_day, rec.recurring_period, todayStr);
      await supabase.from("expenses").update({
        next_run_date: nextDate,
        last_run_date: todayStr,
      }).eq("id", rec.id);

      generated++;
    }

    return new Response(JSON.stringify({ success: true, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-recurring-expenses error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calcNextRunDate(billingDay: number, period: string | null, fromDate: string): string {
  const d = new Date(fromDate);
  switch (period) {
    case "Weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "Yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "Monthly":
    default:
      d.setMonth(d.getMonth() + 1);
      // Clamp to billing day
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(billingDay, maxDay));
      break;
  }
  return d.toISOString().split("T")[0];
}
