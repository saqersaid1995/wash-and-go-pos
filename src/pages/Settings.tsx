import AppHeader from "@/components/AppHeader";
import DataExport from "@/components/settings/DataExport";

export default function Settings() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">إعدادات النظام</p>
        </div>
        <DataExport />
      </main>
    </div>
  );
}
