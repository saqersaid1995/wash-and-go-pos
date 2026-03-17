import { Plus, Trash2, AlertCircle } from "lucide-react";
import type { OrderItem } from "@/types/pos";
import { ITEM_TYPES, GARMENT_CONDITIONS } from "@/types/pos";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatOMR } from "@/lib/currency";

interface PricingRule {
  id: string;
  item_type: string;
  service_type: string;
  price: number;
  is_active: boolean;
}

interface Props {
  items: OrderItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<OrderItem>) => void;
  onRemove: (id: string) => void;
}

function ConditionTags({ itemId, conditions, onUpdate }: { itemId: string; conditions: string[]; onUpdate: Props["onUpdate"] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {GARMENT_CONDITIONS.map((c) => {
        const active = conditions.includes(c.id);
        return (
          <motion.button
            key={c.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const next = active ? conditions.filter((x) => x !== c.id) : [...conditions, c.id];
              onUpdate(itemId, { conditions: next });
            }}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-[120ms] ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {c.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function ItemRow({ item, onUpdate, onRemove, pricingRules, serviceTypes }: { 
  item: OrderItem; 
  onUpdate: Props["onUpdate"]; 
  onRemove: Props["onRemove"];
  pricingRules: PricingRule[];
  serviceTypes: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Check if current combination has a valid price
  const matchingRule = pricingRules.find(
    (r) => r.item_type === item.itemType && r.service_type === item.serviceId && r.is_active
  );
  const hasWarning = item.itemType && item.serviceId && !matchingRule;

  // Get available services for current item type
  const availableServices = item.itemType
    ? [...new Set(pricingRules.filter((r) => r.item_type === item.itemType && r.is_active).map((r) => r.service_type))]
    : serviceTypes;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className={`border rounded-md p-3 bg-background ${hasWarning ? "border-destructive/50" : "border-border"}`}
    >
      <div className="grid grid-cols-[1fr_140px_80px_80px_80px_36px] gap-2 items-center">
        {/* Item Type */}
        <select
          value={item.itemType}
          onChange={(e) => {
            const newItemType = e.target.value;
            // Auto-select price from pricing rules
            const rule = pricingRules.find((r) => r.item_type === newItemType && r.service_type === item.serviceId && r.is_active);
            const updates: Partial<OrderItem> = { itemType: newItemType };
            if (rule) {
              updates.unitPrice = rule.price;
            }
            onUpdate(item.id, updates);
          }}
          className="pos-input w-full text-sm"
        >
          <option value="">Item type...</option>
          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Service */}
        <select
          value={item.serviceId}
          onChange={(e) => {
            const newService = e.target.value;
            const rule = pricingRules.find((r) => r.item_type === item.itemType && r.service_type === newService && r.is_active);
            const updates: Partial<OrderItem> = { serviceId: newService };
            if (rule) {
              updates.unitPrice = rule.price;
            }
            onUpdate(item.id, updates);
          }}
          className="pos-input w-full text-sm"
        >
          <option value="">Service...</option>
          {(availableServices.length > 0 ? availableServices : serviceTypes).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Quantity */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => item.quantity > 1 && onUpdate(item.id, { quantity: item.quantity - 1 })}
            className="w-7 h-7 rounded border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
            className="w-7 h-7 rounded border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
          >
            +
          </button>
        </div>

        {/* Unit Price */}
        <span className="text-sm text-muted-foreground text-right">{formatOMR(item.unitPrice)}</span>

        {/* Total */}
        <span className="text-sm font-semibold text-right">{formatOMR(item.unitPrice * item.quantity)}</span>

        {/* Remove */}
        <button
          onClick={() => onRemove(item.id)}
          className="w-8 h-8 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Price warning */}
      {hasWarning && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          No pricing rule found for this combination. Please set up pricing in Services & Pricing.
        </div>
      )}

      {/* Expand for details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors"
      >
        {expanded ? "Hide details ▲" : "More details ▼"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                placeholder="Color"
                value={item.color || ""}
                onChange={(e) => onUpdate(item.id, { color: e.target.value })}
                className="pos-input w-full text-sm"
              />
              <input
                placeholder="Brand"
                value={item.brand || ""}
                onChange={(e) => onUpdate(item.id, { brand: e.target.value })}
                className="pos-input w-full text-sm"
              />
            </div>
            <textarea
              placeholder="Special notes..."
              value={item.notes || ""}
              onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
              rows={2}
              className="pos-input w-full text-sm mt-2 resize-none py-2"
            />
            <ConditionTags itemId={item.id} conditions={item.conditions} onUpdate={onUpdate} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function GarmentTable({ items, onAdd, onUpdate, onRemove }: Props) {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("service_pricing")
        .select("id, item_type, service_type, price, is_active")
        .eq("is_active", true)
        .order("item_type")
        .order("service_type");
      if (data) {
        setPricingRules(data as PricingRule[]);
        setServiceTypes([...new Set((data as PricingRule[]).map((r) => r.service_type))]);
      }
    }
    load();
  }, []);

  return (
    <div className="pos-section space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="pos-label">Garments ({items.length})</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No items added yet. Click "Add Item" to start.
        </div>
      )}

      {/* Header */}
      {items.length > 0 && (
        <div className="grid grid-cols-[1fr_140px_80px_80px_80px_36px] gap-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Item</span>
          <span>Service</span>
          <span>Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Total</span>
          <span></span>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <ItemRow 
              key={item.id} 
              item={item} 
              onUpdate={onUpdate} 
              onRemove={onRemove}
              pricingRules={pricingRules}
              serviceTypes={serviceTypes}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
