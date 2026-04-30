import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { calcInstallment, createLoan } from "@/lib/loans-queries";
import { formatOMR } from "@/lib/currency";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

export function NewLoanDialog({ open, onOpenChange, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("0");
  const [start, setStart] = useState(new Date().toISOString().split("T")[0]);
  const [term, setTerm] = useState("12");
  const [installment, setInstallment] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setName(""); setBank(""); setPrincipal(""); setRate("0"); setTerm("12");
      setInstallment(""); setNotes(""); setStart(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  const suggested = calcInstallment(parseFloat(principal) || 0, parseFloat(rate) || 0, parseInt(term) || 0);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Loan name is required");
    if (!bank.trim()) return toast.error("Bank name is required");
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const t = parseInt(term);
    if (!(p > 0)) return toast.error("Principal must be positive");
    if (!(r >= 0)) return toast.error("Interest rate must be ≥ 0");
    if (!(t > 0)) return toast.error("Term must be ≥ 1 month");
    const inst = installment ? parseFloat(installment) : 0;

    setSaving(true);
    const { id, error } = await createLoan({
      loan_name: name.trim(),
      bank_name: bank.trim(),
      principal: p,
      annual_interest_rate: r,
      start_date: start,
      term_months: t,
      installment_amount: inst > 0 ? inst : 0,
      notes: notes.trim(),
    });
    setSaving(false);
    if (!id) return toast.error(error || "Failed to create loan");
    toast.success("Loan created and journal posted");
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Loan Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Bank Name *</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Principal (OMR) *</Label><Input type="number" step="0.001" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
            <div><Label>Interest % / yr</Label><Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
            <div><Label>Term (months) *</Label><Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div>
              <Label>Installment (optional)</Label>
              <Input type="number" step="0.001" value={installment} placeholder={suggested ? suggested.toFixed(3) : "auto"} onChange={(e) => setInstallment(e.target.value)} />
            </div>
          </div>
          {suggested > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
              Suggested monthly installment: <span className="font-semibold text-foreground">{formatOMR(suggested)}</span>
            </div>
          )}
          <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="text-xs text-muted-foreground">
            On save: Dr Bank (1020) / Cr Bank Loan (2110) for {principal ? formatOMR(parseFloat(principal)) : "—"}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
