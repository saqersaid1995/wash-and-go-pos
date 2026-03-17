import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, Search, Loader2, DollarSign, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { formatOMR } from "@/lib/currency";
import { ITEM_TYPES } from "@/types/pos";

interface PricingRule {
  id: string;
  item_type: string;
  service_type: string;
  price: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const SERVICE_TYPES = [
  "Wash Only",
  "Iron Only",
  "Wash + Iron",
  "Dry Clean",
  "Special Cleaning",
  "Carpet Cleaning",
  "Blanket Cleaning",
];

export default function ServicesPricing() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Form state
  const [formItemType, setFormItemType] = useState("");
  const [formServiceType, setFormServiceType] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_pricing")
      .select("*")
      .order("item_type")
      .order("service_type");
    if (error) {
      toast.error("Failed to load pricing rules");
      console.error(error);
    }
    setRules((data as PricingRule[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const filteredRules = rules.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.item_type.toLowerCase().includes(q) || r.service_type.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditingRule(null);
    setFormItemType("");
    setFormServiceType("");
    setFormPrice("");
    setFormActive(true);
    setFormNotes("");
    setModalOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormItemType(rule.item_type);
    setFormServiceType(rule.service_type);
    setFormPrice(String(rule.price));
    setFormActive(rule.is_active);
    setFormNotes(rule.notes || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formItemType.trim() || !formServiceType.trim()) {
      toast.error("Item type and service type are required");
      return;
    }
    const price = parseFloat(formPrice);
    if (!price || price <= 0) {
      toast.error("Price must be greater than zero");
      return;
    }

    setSaving(true);

    if (editingRule) {
      const { error } = await supabase
        .from("service_pricing")
        .update({
          item_type: formItemType.trim(),
          service_type: formServiceType.trim(),
          price,
          is_active: formActive,
          notes: formNotes.trim() || null,
        })
        .eq("id", editingRule.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("This item + service combination already exists");
        } else {
          toast.error("Failed to update: " + error.message);
        }
        setSaving(false);
        return;
      }
      toast.success("Pricing rule updated");
    } else {
      const { error } = await supabase
        .from("service_pricing")
        .insert({
          item_type: formItemType.trim(),
          service_type: formServiceType.trim(),
          price,
          is_active: formActive,
          notes: formNotes.trim() || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("This item + service combination already exists");
        } else {
          toast.error("Failed to create: " + error.message);
        }
        setSaving(false);
        return;
      }
      toast.success("Pricing rule created");
    }

    setSaving(false);
    setModalOpen(false);
    loadRules();
  };

  const handleToggleActive = async (rule: PricingRule) => {
    const { error } = await supabase
      .from("service_pricing")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(rule.is_active ? "Rule disabled" : "Rule enabled");
    loadRules();
  };

  const handleDelete = async (rule: PricingRule) => {
    if (!confirm(`Delete pricing for ${rule.item_type} — ${rule.service_type}?`)) return;
    const { error } = await supabase
      .from("service_pricing")
      .delete()
      .eq("id", rule.id);

    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Pricing rule deleted");
    loadRules();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Services & Pricing</h1>
            <Badge variant="outline" className="text-xs">{rules.length} rules</Badge>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/">POS</NavLink>
            <NavLink to="/workflow">Workflow</NavLink>
            <NavLink to="/reports">Reports</NavLink>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-[1200px] mx-auto space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search item or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Pricing Rule
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {search ? "No matching rules" : "No pricing rules yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Add your first item + service pricing rule to get started."}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Type</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id} className={rule.is_active ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{rule.item_type}</TableCell>
                    <TableCell>{rule.service_type}</TableCell>
                    <TableCell className="text-right font-semibold">{formatOMR(rule.price)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={rule.is_active ? "default" : "secondary"}
                        className={`text-[0.6rem] ${rule.is_active ? "bg-success/15 text-success" : ""}`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleActive(rule)}>
                          <Switch checked={rule.is_active} className="scale-75" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(rule)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Pricing Rule" : "Add Pricing Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule ? "Update the item + service pricing." : "Create a new item + service pricing combination."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Type</Label>
              <select
                value={formItemType}
                onChange={(e) => setFormItemType(e.target.value)}
                className="pos-input w-full"
              >
                <option value="">Select item type...</option>
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <select
                value={formServiceType}
                onChange={(e) => setFormServiceType(e.target.value)}
                className="pos-input w-full"
              >
                <option value="">Select service type...</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Price (OMR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">OMR</span>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="pl-12"
                  placeholder="0.000"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
