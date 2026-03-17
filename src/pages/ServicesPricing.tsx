import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
function PricingRulesTab() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [formItemId, setFormItemId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, itemsRes, servicesRes] = await Promise.all([
      supabase.from("service_pricing").select("*").order("item_type").order("service_type"),
      supabase.from("items").select("*").eq("is_active", true).order("item_name"),
      supabase.from("services").select("*").eq("is_active", true).order("service_name"),
    ]);
    setRules((rulesRes.data as PricingRule[]) || []);
    setItems((itemsRes.data as ItemRecord[]) || []);
    setServices((servicesRes.data as ServiceRecord[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getItemName = (rule: PricingRule) => {
    if (rule.item_id) {
      const item = items.find((i) => i.id === rule.item_id);
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

  const openCreate = () => {
    setEditing(null); setFormItemId(""); setFormServiceId(""); setFormPrice(""); setFormActive(true); setModalOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditing(rule);
    setFormItemId(rule.item_id || "");
    setFormServiceId(rule.service_id || "");
    setFormPrice(String(rule.price));
    setFormActive(rule.is_active);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formItemId || !formServiceId) { toast.error("Item and service are required"); return; }
    const price = parseFloat(formPrice);
    if (!price || price <= 0) { toast.error("Price must be greater than zero"); return; }

    const selectedItem = items.find((i) => i.id === formItemId);
    const selectedService = services.find((s) => s.id === formServiceId);

    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("service_pricing").update({
        item_id: formItemId,
        service_id: formServiceId,
        item_type: selectedItem?.item_name || "",
        service_type: selectedService?.service_name || "",
        price,
        is_active: formActive,
      }).eq("id", editing.id);
      if (error) { toast.error(error.code === "23505" ? "This item + service combination already exists" : error.message); setSaving(false); return; }
      toast.success("Pricing rule updated");
    } else {
      const { error } = await supabase.from("service_pricing").insert({
        item_id: formItemId,
        service_id: formServiceId,
        item_type: selectedItem?.item_name || "",
        service_type: selectedService?.service_name || "",
        price,
        is_active: formActive,
      });
      if (error) { toast.error(error.code === "23505" ? "This item + service combination already exists" : error.message); setSaving(false); return; }
      toast.success("Pricing rule created");
    }
    setSaving(false); setModalOpen(false); load();
  };

  const handleDelete = async (rule: PricingRule) => {
    if (!confirm(`Delete pricing for ${getItemName(rule)} — ${getServiceName(rule)}?`)) return;
    const { error } = await supabase.from("service_pricing").delete().eq("id", rule.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Pricing rule deleted"); load();
  };

  const handleToggle = async (rule: PricingRule) => {
    await supabase.from("service_pricing").update({ is_active: !rule.is_active }).eq("id", rule.id);
    toast.success(rule.is_active ? "Rule disabled" : "Rule enabled"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pricing rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Pricing Rule</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search ? "No matching rules" : "No pricing rules yet"}</p>
          <p className="text-sm mt-1">{search ? "Try a different search term" : "Add your first item + service pricing rule."}</p>
        </div>
      ) : (() => {
        // Group rules by item name
        const grouped: Record<string, PricingRule[]> = {};
        filtered.forEach((rule) => {
          const name = getItemName(rule);
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push(rule);
        });
        const sortedItems = Object.keys(grouped).sort();

        return (
          <div className="space-y-4">
            {sortedItems.map((itemName) => (
              <div key={itemName} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {itemName}
                    <Badge variant="secondary" className="text-[0.6rem] ml-1">{grouped[itemName].length} {grouped[itemName].length === 1 ? "service" : "services"}</Badge>
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[itemName].map((rule) => (
                      <TableRow key={rule.id} className={rule.is_active ? "" : "opacity-50"}>
                        <TableCell className="font-medium">{getServiceName(rule)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatOMR(rule.price)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={rule.is_active ? "default" : "secondary"} className={`text-[0.6rem] ${rule.is_active ? "bg-success/15 text-success" : ""}`}>
                            {rule.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(rule)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggle(rule)}><Switch checked={rule.is_active} className="scale-75" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(rule)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        );
      })()}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pricing Rule" : "Add Pricing Rule"}</DialogTitle>
            <DialogDescription>{editing ? "Update the pricing." : "Create a new item + service pricing combination."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <select value={formItemId} onChange={(e) => setFormItemId(e.target.value)} className="pos-input w-full">
                <option value="">Select item...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <select value={formServiceId} onChange={(e) => setFormServiceId(e.target.value)} className="pos-input w-full">
                <option value="">Select service...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.service_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Price (OMR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">OMR</span>
                <Input type="number" step="0.001" min="0.001" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="pl-12" placeholder="0.000" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Update Rule" : "Create Rule"}
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
