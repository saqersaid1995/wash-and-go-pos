import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, Search, Loader2, DollarSign, Settings, Package, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { formatOMR } from "@/lib/currency";

// ─── Types ───
interface ItemRecord {
  id: string;
  item_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceRecord {
  id: string;
  service_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PricingRule {
  id: string;
  item_id: string | null;
  service_id: string | null;
  item_type: string;
  service_type: string;
  price: number;
  currency: string;
  is_active: boolean;
  is_default_service: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Items Tab ───
function ItemsTab() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("items").select("*").order("item_name");
    setItems((data as ItemRecord[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => !search || i.item_name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setFormName(""); setFormActive(true); setModalOpen(true); };
  const openEdit = (item: ItemRecord) => { setEditing(item); setFormName(item.item_name); setFormActive(item.is_active); setModalOpen(true); };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Item name is required"); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("items").update({ item_name: formName.trim(), is_active: formActive }).eq("id", editing.id);
      if (error) { toast.error(error.code === "23505" ? "Item name already exists" : error.message); setSaving(false); return; }
      toast.success("Item updated");
    } else {
      const { error } = await supabase.from("items").insert({ item_name: formName.trim(), is_active: formActive });
      if (error) { toast.error(error.code === "23505" ? "Item name already exists" : error.message); setSaving(false); return; }
      toast.success("Item created");
    }
    setSaving(false); setModalOpen(false); load();
  };

  const handleDelete = async (item: ItemRecord) => {
    if (!confirm(`Delete "${item.item_name}"? This will also remove its pricing rules.`)) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Item deleted"); load();
  };

  const handleToggle = async (item: ItemRecord) => {
    await supabase.from("items").update({ is_active: !item.is_active }).eq("id", item.id);
    toast.success(item.is_active ? "Item disabled" : "Item enabled"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Item</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? "No matching items" : "No items yet"}</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className={item.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.is_active ? "default" : "secondary"} className={`text-[0.6rem] ${item.is_active ? "bg-success/15 text-success" : ""}`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggle(item)}><Switch checked={item.is_active} className="scale-75" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>{editing ? "Update the item name." : "Add a new laundry item type."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Thobe, Kumma, Ghutra..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Services Tab ───
function ServicesTab() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("service_name");
    setServices((data as ServiceRecord[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = services.filter((s) => !search || s.service_name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setFormName(""); setFormActive(true); setModalOpen(true); };
  const openEdit = (svc: ServiceRecord) => { setEditing(svc); setFormName(svc.service_name); setFormActive(svc.is_active); setModalOpen(true); };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Service name is required"); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("services").update({ service_name: formName.trim(), is_active: formActive }).eq("id", editing.id);
      if (error) { toast.error(error.code === "23505" ? "Service name already exists" : error.message); setSaving(false); return; }
      toast.success("Service updated");
    } else {
      const { error } = await supabase.from("services").insert({ service_name: formName.trim(), is_active: formActive });
      if (error) { toast.error(error.code === "23505" ? "Service name already exists" : error.message); setSaving(false); return; }
      toast.success("Service created");
    }
    setSaving(false); setModalOpen(false); load();
  };

  const handleDelete = async (svc: ServiceRecord) => {
    if (!confirm(`Delete "${svc.service_name}"? This will also remove its pricing rules.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", svc.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Service deleted"); load();
  };

  const handleToggle = async (svc: ServiceRecord) => {
    await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
    toast.success(svc.is_active ? "Service disabled" : "Service enabled"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Service</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? "No matching services" : "No services yet"}</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((svc) => (
                <TableRow key={svc.id} className={svc.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{svc.service_name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={svc.is_active ? "default" : "secondary"} className={`text-[0.6rem] ${svc.is_active ? "bg-success/15 text-success" : ""}`}>
                      {svc.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(svc)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggle(svc)}><Switch checked={svc.is_active} className="scale-75" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(svc)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>{editing ? "Update the service." : "Add a new laundry service type."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Wash, Iron, Dry Clean..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Pricing Rules Tab ───
interface ServicePriceRow {
  serviceId: string;
  serviceName: string;
  enabled: boolean;
  price: string;
  existingRuleId?: string;
}

function PricingRulesTab() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [allItems, setAllItems] = useState<ItemRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formItemId, setFormItemId] = useState("");
  const [serviceRows, setServiceRows] = useState<ServicePriceRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, itemsRes, allItemsRes, servicesRes] = await Promise.all([
      supabase.from("service_pricing").select("*").order("item_type").order("service_type"),
      supabase.from("items").select("*").eq("is_active", true).order("item_name"),
      supabase.from("items").select("*").order("item_name"),
      supabase.from("services").select("*").eq("is_active", true).order("service_name"),
    ]);
    setRules((rulesRes.data as PricingRule[]) || []);
    setItems((itemsRes.data as ItemRecord[]) || []);
    setAllItems((allItemsRes.data as ItemRecord[]) || []);
    setServices((servicesRes.data as ServiceRecord[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getItemName = (rule: PricingRule) => {
    if (rule.item_id) {
      const item = allItems.find((i) => i.id === rule.item_id);
      return item?.item_name || rule.item_type;
    }
    return rule.item_type;
  };

  const getServiceName = (rule: PricingRule) => {
    if (rule.service_id) {
      const svc = services.find((s) => s.id === rule.service_id);
      return svc?.service_name || rule.service_type;
    }
    return rule.service_type;
  };

  const filtered = rules.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getItemName(r).toLowerCase().includes(q) || getServiceName(r).toLowerCase().includes(q);
  });

  const openConfigForItem = (itemId: string) => {
    setFormItemId(itemId);
    const itemRules = rules.filter((r) => r.item_id === itemId);
    const rows: ServicePriceRow[] = services.map((svc) => {
      const existing = itemRules.find((r) => r.service_id === svc.id);
      return {
        serviceId: svc.id,
        serviceName: svc.service_name,
        enabled: !!existing && existing.is_active,
        price: existing ? String(existing.price) : "",
        existingRuleId: existing?.id,
      };
    });
    setServiceRows(rows);
    setModalOpen(true);
  };

  const openCreate = () => {
    setFormItemId("");
    setServiceRows([]);
    setModalOpen(true);
  };

  const onItemSelect = (itemId: string) => {
    setFormItemId(itemId);
    const itemRules = rules.filter((r) => r.item_id === itemId);
    const rows: ServicePriceRow[] = services.map((svc) => {
      const existing = itemRules.find((r) => r.service_id === svc.id);
      return {
        serviceId: svc.id,
        serviceName: svc.service_name,
        enabled: !!existing && existing.is_active,
        price: existing ? String(existing.price) : "",
        existingRuleId: existing?.id,
      };
    });
    setServiceRows(rows);
  };

  const updateRow = (serviceId: string, updates: Partial<ServicePriceRow>) => {
    setServiceRows((prev) => prev.map((r) => r.serviceId === serviceId ? { ...r, ...updates } : r));
  };

  const handleSave = async () => {
    if (!formItemId) { toast.error("Please select an item"); return; }
    const enabledRows = serviceRows.filter((r) => r.enabled);
    for (const row of enabledRows) {
      const price = parseFloat(row.price);
      if (!price || price <= 0) {
        toast.error(`Price for "${row.serviceName}" must be greater than zero`);
        return;
      }
    }

    const selectedItem = items.find((i) => i.id === formItemId);
    if (!selectedItem) return;

    setSaving(true);

    // Upsert enabled rows, disable unchecked existing rows
    for (const row of serviceRows) {
      const price = parseFloat(row.price) || 0;
      if (row.enabled) {
        if (row.existingRuleId) {
          await supabase.from("service_pricing").update({
            price,
            is_active: true,
            item_type: selectedItem.item_name,
            service_type: row.serviceName,
          }).eq("id", row.existingRuleId);
        } else {
          await supabase.from("service_pricing").insert({
            item_id: formItemId,
            service_id: row.serviceId,
            item_type: selectedItem.item_name,
            service_type: row.serviceName,
            price,
            is_active: true,
          });
        }
      } else if (row.existingRuleId) {
        await supabase.from("service_pricing").update({ is_active: false }).eq("id", row.existingRuleId);
      }
    }

    setSaving(false);
    setModalOpen(false);
    toast.success("Pricing saved for " + selectedItem.item_name);
    load();
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Remove all pricing rules for "${itemName}"?`)) return;
    await supabase.from("service_pricing").delete().eq("item_id", itemId);
    toast.success("Pricing removed for " + itemName);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pricing rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Configure Item Pricing</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? "No matching rules" : "No pricing rules yet"}</p>
          <p className="text-sm mt-1">{search ? "Try a different search term" : "Click \"Configure Item Pricing\" to set up prices."}</p>
        </div>
      ) : (() => {
        const grouped: Record<string, { itemId: string; rules: PricingRule[] }> = {};
        filtered.forEach((rule) => {
          const name = getItemName(rule);
          if (!grouped[name]) grouped[name] = { itemId: rule.item_id || "", rules: [] };
          grouped[name].rules.push(rule);
        });
        const sortedItems = Object.keys(grouped).sort();

        return (
          <div className="space-y-4">
            {sortedItems.map((itemName) => (
              <div key={itemName} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {itemName}
                    <Badge variant="secondary" className="text-[0.6rem] ml-1">{grouped[itemName].rules.filter(r => r.is_active).length} active</Badge>
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openConfigForItem(grouped[itemName].itemId)}>
                      <Pencil className="h-3 w-3" /> Edit Pricing
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(grouped[itemName].itemId, itemName)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {grouped[itemName].rules.map((rule) => (
                    <div key={rule.id} className={`flex items-center justify-between px-4 py-2.5 text-sm ${rule.is_active ? "" : "opacity-40"}`}>
                      <span className="font-medium">{getServiceName(rule)}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatOMR(rule.price)}</span>
                        <Badge variant={rule.is_active ? "default" : "secondary"} className={`text-[0.55rem] ${rule.is_active ? "bg-success/15 text-success" : ""}`}>
                          {rule.is_active ? "Active" : "Off"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Item Pricing Configuration</DialogTitle>
            <DialogDescription>Select an item and configure prices for each service.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label>Item</Label>
              <select value={formItemId} onChange={(e) => onItemSelect(e.target.value)} className="pos-input w-full">
                <option value="">Select item...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
              </select>
            </div>

            {formItemId && serviceRows.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_60px_140px] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Service</span>
                  <span className="text-center">Enabled</span>
                  <span className="text-right">Price (OMR)</span>
                </div>
                <div className="divide-y divide-border">
                  {serviceRows.map((row) => (
                    <div key={row.serviceId} className={`grid grid-cols-[1fr_60px_140px] gap-2 px-3 py-2.5 items-center transition-opacity ${row.enabled ? "" : "opacity-50"}`}>
                      <span className="text-sm font-medium">{row.serviceName}</span>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={row.enabled}
                          onCheckedChange={(checked) => updateRow(row.serviceId, { enabled: !!checked })}
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">OMR</span>
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={row.price}
                          onChange={(e) => updateRow(row.serviceId, { price: e.target.value })}
                          disabled={!row.enabled}
                          className="pl-10 h-8 text-sm"
                          placeholder="0.000"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formItemId && serviceRows.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No active services found. Add services in the Services tab first.
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !formItemId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Pricing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ───
export default function ServicesPricing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Services & Pricing</h1>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/">POS</NavLink>
            <NavLink to="/workflow">Workflow</NavLink>
            <NavLink to="/reports">Reports</NavLink>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-[1200px] mx-auto">
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="items" className="gap-1.5"><Package className="h-4 w-4" /> Items</TabsTrigger>
            <TabsTrigger value="services" className="gap-1.5"><Wrench className="h-4 w-4" /> Services</TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5"><DollarSign className="h-4 w-4" /> Pricing</TabsTrigger>
          </TabsList>
          <TabsContent value="items"><ItemsTab /></TabsContent>
          <TabsContent value="services"><ServicesTab /></TabsContent>
          <TabsContent value="pricing"><PricingRulesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
