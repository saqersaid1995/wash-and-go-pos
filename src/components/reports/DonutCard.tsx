import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

export interface DonutSlice {
  name: string;
  value: number;
  color?: string;
}

interface DonutCardProps {
  title: string;
  data: DonutSlice[];
  centerValue: string | number;
  centerLabel: string;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
  colors?: string[];
}

const DEFAULT_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 72%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(170, 60%, 45%)",
  "hsl(15, 80%, 55%)",
];

export function DonutCard({
  title,
  data,
  centerValue,
  centerLabel,
  formatValue = (v) => String(v),
  emptyMessage = "No data",
  colors = DEFAULT_COLORS,
}: DonutCardProps) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Donut with center value */}
            <div className="relative shrink-0">
              <ChartContainer
                config={{ value: { label: title } }}
                className="h-[180px] w-[180px] aspect-square"
              >
                <PieChart>
                  <Pie
                    data={filtered}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={62}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {filtered.map((d, i) => (
                      <Cell key={i} fill={d.color || colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold tracking-tight leading-none">{centerValue}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{centerLabel}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 w-full space-y-2.5 min-w-0">
              {filtered.map((d, i) => {
                const pct = total > 0 ? (d.value / total) * 100 : 0;
                return (
                  <div key={d.name} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color || colors[i % colors.length] }}
                    />
                    <span className="flex-1 truncate text-foreground">{d.name}</span>
                    <span className="font-semibold tabular-nums">{formatValue(d.value)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
