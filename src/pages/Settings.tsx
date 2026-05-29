import AppHeader from "@/components/AppHeader";
import DataExport from "@/components/settings/DataExport";

export default function Settings() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Settings" subtitle="إعدادات النظام" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <DataExport />
      </main>
    </div>
  );
}
