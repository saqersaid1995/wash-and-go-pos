import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";
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
  nameAr: string;
  imageUrl: string;
  defaultService: string;
  defaultPrice: number;
  sortOrder: number;
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
        supabase.from("items").select("item_name, item_name_ar, image_url, sort_order, show_in_quick_add").eq("is_active", true).eq("show_in_quick_add", true).order("sort_order").order("item_name"),
        supabase.from("service_pricing").select("item_type, service_type, price, is_active, is_default_service").eq("is_active", true),
      ]);

      const allItems = (itemsRes.data || []) as Array<{ item_name: string; item_name_ar: string; image_url: string; sort_order: number; show_in_quick_add: boolean }>;
      const rules = (pricingRes.data || []) as PricingRule[];

      const mapped: QuickItem[] = allItems.map((i) => {
        const defaultRule = rules.find((r) => r.item_type === i.item_name && r.is_default_service);
        const fallback = rules.find((r) => r.item_type === i.item_name);
        const rule = defaultRule || fallback;
        return {
          name: i.item_name,
          nameAr: i.item_name_ar || "",
          imageUrl: i.image_url || "",
          defaultService: rule?.service_type || "",
          defaultPrice: rule?.price || 0,
          sortOrder: i.sort_order,
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
              className="relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all text-center min-h-[100px]"
            >
              {/* Image or fallback */}
              {qi.imageUrl ? (
                <img
                  src={qi.imageUrl}
                  alt={qi.name}
                  className="h-10 w-10 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {qi.name.charAt(0)}
                </div>
              )}
              {/* Names */}
              <span className="text-[0.65rem] font-semibold leading-tight">{qi.name}</span>
              {qi.nameAr && (
                <span className="text-[0.6rem] text-muted-foreground leading-tight" dir="rtl">{qi.nameAr}</span>
              )}
              {/* Price */}
              <span className="text-[0.55rem] text-muted-foreground">{formatOMR(qi.defaultPrice)}</span>
              {/* Count badge */}
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
