import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  scanning: boolean;
  onToggle: () => void;
}

export default function QrScanner({ onScan, scanning, onToggle }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const safeStop = async (scanner: Html5Qrcode | null) => {
    if (!scanner || stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      const state = scanner.getState();
      // State 2 = SCANNING, 3 = PAUSED
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // already stopped
    } finally {
      stoppingRef.current = false;
    }
  };

  useEffect(() => {
    if (!scanning) {
      safeStop(scannerRef.current).then(() => {
        scannerRef.current = null;
      });
      return;
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    setError(null);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          safeStop(scanner).then(() => {
            onToggle();
          });
        },
        () => {}
      )
      .catch(() => {
        setError("Camera not available. Use manual entry below.");
        onToggle();
      });

    return () => {
      safeStop(scanner);
    };
  }, [scanning]);

  return (
    <div className="space-y-3">
      <Button
        variant={scanning ? "destructive" : "default"}
        size="sm"
        className="h-9 text-xs gap-1.5 w-full"
        onClick={onToggle}
      >
        {scanning ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
        {scanning ? "Stop Camera" : "Start Camera Scan"}
      </Button>

      <div
        id="qr-reader"
        className={`rounded-lg overflow-hidden bg-secondary ${scanning ? "min-h-[280px]" : "h-0"}`}
      />

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}