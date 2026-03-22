import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { formatOMR } from "@/lib/currency";
import type { OrderItem } from "@/types/pos";

interface PricingRule {
  item_type: string;
  service_type: string;
  price: number;
  is_active: boolean;
  is_default_service: boolean;
}

interface QuickItem {
  name: string;
  defaultService: string;
  defaultPrice: number;
}

interface Props {
  items: OrderItem[];
  onAddQuickItem: (itemType: string, serviceId: string, price: number) => void;
}

export default function QuickOrderPanel({ items, onAddQuickItem }: Props) {
  const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [itemsRes, pricingRes] = await Promise.all([
        supabase.from("items").select("item_name").eq("is_active", true).order("item_name"),
        supabase.from("service_pricing").select("item_type, service_type, price, is_active, is_default_service").eq("is_active", true),
      ]);

      const allItems = itemsRes.data || [];
      const rules = (pricingRes.data || []) as PricingRule[];

      const mapped: QuickItem[] = allItems.map((i) => {
        const defaultRule = rules.find((r) => r.item_type === i.item_name && r.is_default_service);
        const fallback = rules.find((r) => r.item_type === i.item_name);
        const rule = defaultRule || fallback;
        return {
          name: i.item_name,
          defaultService: rule?.service_type || "",
          defaultPrice: rule?.price || 0,
        };
      }).filter((q) => q.defaultService);

      setQuickItems(mapped);
      setLoading(false);
    }
    load();
  }, []);

  // Count how many of each item already exist
  const itemCounts: Record<string, number> = {};
  items.forEach((item) => {
    itemCounts[item.itemType] = (itemCounts[item.itemType] || 0) + item.quantity;
  });

  if (loading) return null;

  return (
    <div className="pos-section space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="pos-label">Quick Add</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {quickItems.map((qi) => {
          const count = itemCounts[qi.name] || 0;
          return (
            <motion.button
              key={qi.name}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddQuickItem(qi.name, qi.defaultService, qi.defaultPrice)}
              className="relative flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all text-center min-h-[72px]"
            >
              <span className="text-xs font-semibold leading-tight">{qi.name}</span>
              <span className="text-[0.6rem] text-muted-foreground">{formatOMR(qi.defaultPrice)}</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[0.6rem] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
