import { useState, useEffect, useCallback } from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import { refreshOfflineCache } from "@/lib/offline-cache";
import { promptInstall, getDeferredPrompt, isPWAInstalled, cacheAppShell } from "@/lib/pwa";
import {
  Download, RefreshCw, Cloud, Wifi, WifiOff, CheckCircle2, Loader2, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getMeta } from "@/lib/offline-db";

export default function OfflineModePanel() {
  const { isOnline, pendingCount, lastSyncTime, isSyncing, syncNow } = useNetwork();
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isPWAInstalled());
  const [isCaching, setIsCaching] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<Record<string, string | null>>({});

  // Listen for install prompt availability
  useEffect(() => {
    const check = () => setCanInstall(!!getDeferredPrompt());
    check();
    window.addEventListener("pwa-install-available", check);
    return () => window.removeEventListener("pwa-install-available", check);
  }, []);

  // Load cache timestamps
  useEffect(() => {
    (async () => {
      const [customers, items, services, pricing] = await Promise.all([
        getMeta("customers_cached_at"),
        getMeta("items_cached_at"),
        getMeta("services_cached_at"),
        getMeta("pricing_cached_at"),
      ]);
      setCacheInfo({ customers, items, services, pricing });
    })();
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setIsInstalled(true);
      toast.success("App installed! You can now use it offline.");
    } else {
      toast.info("Installation cancelled.");
    }
  };

  const handleEnableOffline = useCallback(async () => {
    setIsCaching(true);
    try {
      // 1. Cache app shell via SW
      await cacheAppShell();
      // 2. Cache reference data to IndexedDB
      const result = await refreshOfflineCache();
      if (result.success) {
        toast.success(
          `Offline data ready! Cached ${result.counts.customers || 0} customers, ${result.counts.items || 0} items, ${result.counts.pricing || 0} prices.`
        );
        // Refresh cache info display
        const [customers, items, services, pricing] = await Promise.all([
          getMeta("customers_cached_at"),
          getMeta("items_cached_at"),
          getMeta("services_cached_at"),
          getMeta("pricing_cached_at"),
        ]);
        setCacheInfo({ customers, items, services, pricing });
      } else {
        toast.error("Failed to cache offline data.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error preparing offline mode.");
    } finally {
      setIsCaching(false);
    }
  }, []);

  const hasCachedData = Object.values(cacheInfo).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending changes</span>
            <Badge variant={pendingCount > 0 ? "secondary" : "outline"}>
              {pendingCount}
            </Badge>
          </div>
          {lastSyncTime && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last sync</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Offline Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Install PWA */}
          {canInstall && !isInstalled && (
            <Button onClick={handleInstall} className="w-full gap-2" variant="default">
              <Smartphone className="h-4 w-4" />
              Install App on Device
            </Button>
          )}

          {isInstalled && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 pb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              App installed on this device
            </div>
          )}

          {/* Enable / Refresh Offline Data */}
          <Button
            onClick={handleEnableOffline}
            disabled={isCaching || !isOnline}
            className="w-full gap-2"
            variant={hasCachedData ? "outline" : "default"}
          >
            {isCaching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasCachedData ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isCaching
              ? "Downloading data..."
              : hasCachedData
              ? "Refresh Offline Data"
              : "Enable Offline Mode"}
          </Button>

          {/* Sync Now */}
          {pendingCount > 0 && (
            <Button
              onClick={syncNow}
              disabled={isSyncing || !isOnline}
              className="w-full gap-2"
              variant="outline"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              {isSyncing ? "Syncing..." : `Sync Now (${pendingCount} pending)`}
            </Button>
          )}

          {!isOnline && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              Connect to the internet to sync or refresh data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cached Data Info */}
      {hasCachedData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Cached Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(cacheInfo).map(([key, val]) =>
              val ? (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{key}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(val), { addSuffix: true })}
                  </span>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
