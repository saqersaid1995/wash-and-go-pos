import { useEffect, useRef, useCallback } from "react";

const BARCODE_PATTERN = /^(ORDER:)?ORD-\d{6}-\d{4}$/;
const MAX_INPUT_DURATION_MS = 300; // Scanner types full code in <300ms
const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Global barcode scanner listener.
 * Detects rapid keyboard input matching order barcode format,
 * ignores input when user is typing in form fields.
 */
export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstKeyTimeRef = useRef<number>(0);

  const resetBuffer = useCallback(() => {
    bufferRef.current = "";
    firstKeyTimeRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Skip if user is focused on a form field, dialog, or any area that explicitly opts out
      if (
        IGNORED_TAGS.has(target.tagName) ||
        target.isContentEditable ||
        target.closest("[contenteditable]") ||
        target.closest("[data-disable-global-barcode='true']")
      ) {
        return;
      }

      // Skip modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        const buffer = bufferRef.current.trim();
        const elapsed = Date.now() - firstKeyTimeRef.current;

        // Only trigger if input was fast (scanner) and matches format
        if (buffer.length >= 10 && elapsed < MAX_INPUT_DURATION_MS * 3 && BARCODE_PATTERN.test(buffer)) {
          e.preventDefault();
          e.stopPropagation();
          const code = buffer.startsWith("ORDER:") ? buffer.slice(6) : buffer;
          onScan(code);
        }
        resetBuffer();
        return;
      }

      // Only collect printable single characters
      if (e.key.length !== 1) return;

      const now = Date.now();
      if (!bufferRef.current) {
        firstKeyTimeRef.current = now;
      }

      bufferRef.current += e.key;

      // Auto-clear buffer if typing is too slow (human typing)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(resetBuffer, 500);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      resetBuffer();
    };
  }, [enabled, onScan, resetBuffer]);
}
