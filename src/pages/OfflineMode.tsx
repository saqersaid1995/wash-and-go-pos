import AppHeader from "@/components/AppHeader";
import OfflineModePanel from "@/components/OfflineModePanel";

export default function OfflineMode() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Lavinderia POS" subtitle="Offline Mode" />
      <div className="max-w-md mx-auto p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">Offline Mode</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Prepare the app for offline use. Download data and install the app on your device to keep working without internet.
        </p>
        <OfflineModePanel />
      </div>
    </div>
  );
}
