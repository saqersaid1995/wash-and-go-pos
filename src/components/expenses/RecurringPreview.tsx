import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ArrowRight } from "lucide-react";
import { formatOMR } from "@/lib/currency";
import type { Expense } from "@/lib/expense-queries";

interface RecurringPreviewProps {
  templates: Expense[];
}

const ordinalSuffix = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function RecurringPreview({ templates }: RecurringPreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Recurring Expense Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/30 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{t.category}</Badge>
                <span className="text-muted-foreground">{t.description || t.category}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{formatOMR(t.amount)}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{t.recurring_period}</span>
                  {t.billing_day && (
                    <>
                      <ArrowRight className="h-3 w-3" />
                      <span>{ordinalSuffix(t.billing_day)} of month</span>
                    </>
                  )}
                </div>
                {t.next_run_date && (
                  <Badge variant="outline" className="text-xs">
                    Next: {t.next_run_date}
                  </Badge>
                )}
                {t.last_run_date && (
                  <span className="text-xs text-muted-foreground">
                    Last: {t.last_run_date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
