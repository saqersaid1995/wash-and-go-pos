import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  scanning: boolean;
  onToggle: () => void;
}

/**
 * Native camera QR/barcode scanner using getUserMedia + BarcodeDetector.
 * Avoids html5-qrcode library which has known iOS PWA bugs.
 */
export default function QrScanner({ onScan, scanning, onToggle }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!scanning) {
      stopCamera();
      return;
    }

    scannedRef.current = false;
    setError(null);

    let cancelled = false;

    const startCamera = async () => {
      // Check for BarcodeDetector support
      const hasBarcodeDetector = "BarcodeDetector" in window;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("autoplay", "true");
          await videoRef.current.play();
        }

        if (!hasBarcodeDetector) {
          setError("QR scanning not supported on this device. Use manual entry below.");
          return;
        }

        // Use native BarcodeDetector
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"],
        });

        const scanFrame = async () => {
          if (cancelled || scannedRef.current || !videoRef.current) return;

          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && !scannedRef.current) {
              scannedRef.current = true;
              const code = barcodes[0].rawValue;
              stopCamera();
              onScan(code);
              onToggle();
              return;
            }
          } catch {
            // detect() can fail on some frames, just continue
          }

          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Camera error:", err);
        setError("Camera not available. Use manual entry below.");
        onToggle();
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [scanning, onScan, onToggle, stopCamera]);

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
        className={`rounded-lg overflow-hidden bg-secondary ${scanning ? "min-h-[280px]" : "h-0"}`}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ display: scanning ? "block" : "none" }}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
