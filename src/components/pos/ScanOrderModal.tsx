import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchOrderByCode } from "@/lib/supabase-queries";
import { Loader2, ScanBarcode, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ScanOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ScanOrderModal({ open, onOpenChange }: ScanOrderModalProps) {
  const [value, setValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      // Small delay to ensure DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSearch = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Basic format validation
    if (trimmed.length < 3) {
      setError("Invalid barcode format");
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const order = await searchOrderByCode(trimmed);
      if (order) {
        toast.success(`Order ${order.orderNumber} found`);
        onOpenChange(false);
        navigate(`/order/${order.id}`);
      } else {
        setError("Order not found");
        // Clear and re-focus for next scan
        setValue("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setError("Search failed. Please try again.");
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setSearching(false);
    }
  }, [navigate, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-primary" />
            Scan Order
          </DialogTitle>
          <DialogDescription>
            Scan a barcode or type an order number to open it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanning indicator */}
          <div className="flex items-center justify-center py-6">
            <div className="text-center space-y-2">
              {searching ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </>
              ) : (
                <>
                  <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                    <ScanBarcode className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting for barcode scan...</p>
                </>
              )}
            </div>
          </div>

          {/* Input field */}
          <div className="space-y-2">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. ORD-260324-6892"
              className="text-center text-lg font-mono tracking-wider"
              autoComplete="off"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 text-destructive text-sm justify-center">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Manual search button */}
          <Button
            className="w-full"
            disabled={!value.trim() || searching}
            onClick={() => handleSearch(value)}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Search Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
