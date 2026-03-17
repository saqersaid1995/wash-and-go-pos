import { Search, UserPlus } from "lucide-react";
import type { Customer } from "@/types/pos";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  phone: string;
  name: string;
  notes: string;
  matchedCustomer: Customer | null;
  onPhoneChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onNotesChange: (v: string) => void;
}

export default function CustomerSection({
  phone, name, notes, matchedCustomer,
  onPhoneChange, onNameChange, onNotesChange,
}: Props) {
  return (
    <div className="pos-section space-y-3">
      <h2 className="pos-label">Customer</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          autoFocus
          type="tel"
          placeholder="Phone number..."
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="pos-input w-full pl-10"
        />
      </div>
      <AnimatePresence>
        {matchedCustomer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md text-sm"
          >
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="font-medium">Matched: {matchedCustomer.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        type="text"
        placeholder="Customer Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="pos-input w-full"
      />
      <textarea
        placeholder="Customer notes (optional)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={2}
        className="pos-input w-full resize-none py-2"
      />
    </div>
  );
}
