import { useState } from "react";
import JSZip from "jszip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TableResult = { table: string; count: number; ok: boolean; error?: string };

function pad(n: number) { return n.toString().padStart(2, "0"); }
function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

export default function DataExport() {
  const [exporting, setExporting] = useState(false);
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TableResult[]>([]);
  const [done, setDone] = useState(false);

  const runExport = async () => {
    setExporting(true);
    setDone(false);
    setResults([]);
    setProgress(0);
    setCurrentTable(null);
    setCurrentCount(0);

    try {
      const { data: listData, error: listErr } = await supabase.functions.invoke("export-database", {
        body: null,
        method: "GET" as any,
        // invoke does not support query params directly; use raw fetch instead
      } as any).catch(() => ({ data: null, error: { message: "list failed" } as any }));

      // Fallback: call directly with fetch since we need query params
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database?action=list`;
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const listRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!listRes.ok) throw new Error(`Failed to list tables (${listRes.status})`);
      const { tables } = await listRes.json() as { tables: string[] };
      if (!tables?.length) throw new Error("No tables found");

      const zip = new JSZip();
      const out: TableResult[] = [];

      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        setCurrentTable(t);
        setCurrentCount(0);
        try {
          const tUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-database?table=${encodeURIComponent(t)}`;
          const tRes = await fetch(tUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          });
          if (!tRes.ok) {
            const errBody = await tRes.json().catch(() => ({}));
            throw new Error(errBody.error || `HTTP ${tRes.status}`);
          }
          const { count, csv } = await tRes.json() as { count: number; csv: string };
          zip.file(`${t}.csv`, csv ?? "");
          setCurrentCount(count);
          out.push({ table: t, count, ok: true });
        } catch (e) {
          out.push({ table: t, count: 0, ok: false, error: (e as Error).message });
        }
        setResults([...out]);
        setProgress(Math.round(((i + 1) / tables.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `lovable-full-export-${timestamp()}.zip`;
      a.click();
      URL.revokeObjectURL(dl);

      setDone(true);
      const okCount = out.filter((r) => r.ok).length;
      toast.success(`تم تصدير ${okCount} جدول بنجاح`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
      setCurrentTable(null);
    }
  };

  const okResults = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  return (
    <Card>
      <CardHeader>
        <CardTitle dir="rtl">تصدير قاعدة البيانات</CardTitle>
        <CardDescription dir="rtl">
          قم بتنزيل نسخة كاملة من جميع جداول قاعدة البيانات بصيغة CSV داخل ملف ZIP، لاستخدامها في النسخة الأوفلاين من البرنامج.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runExport} disabled={exporting} dir="rtl">
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          تصدير جميع الجداول ZIP
        </Button>

        {exporting && (
          <div className="space-y-2" dir="rtl">
            <Progress value={progress} />
            {currentTable && (
              <p className="text-sm text-muted-foreground">
                جاري تصدير {currentTable} — {currentCount} سجل
              </p>
            )}
          </div>
        )}

        {(results.length > 0 || done) && (
          <div className="space-y-3" dir="rtl">
            {done && (
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                تم تصدير {okResults.length} جدول بنجاح
              </p>
            )}
            <div className="max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right p-2">الجدول</th>
                    <th className="text-right p-2">السجلات</th>
                    <th className="text-right p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.table} className="border-t">
                      <td className="p-2 font-mono">{r.table}</td>
                      <td className="p-2">{r.count}</td>
                      <td className="p-2">
                        {r.ok ? (
                          <span className="text-primary">OK</span>
                        ) : (
                          <span className="text-destructive" title={r.error}>فشل</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {failed.length > 0 && (
              <div className="text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  جداول فشل تصديرها: {failed.map((f) => f.table).join(", ")}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
