import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, AlertTriangle } from "lucide-react";
import { useStandaloneAppMeta } from "@/hooks/useStandaloneAppMeta";
import { BUSINESS } from "@/lib/business-config";
import SupportInboxTab from "@/components/support-lite/SupportInboxTab";
import SupportComplaintsTab from "@/components/support-lite/SupportComplaintsTab";

export default function SupportLite() {
  const [activeTab, setActiveTab] = useState("inbox");

  useStandaloneAppMeta({
    title: "Lavinderia Support",
    description: "Lavinderia Support - Customer Messages & Complaints",
    applicationName: "Lavinderia Support",
    appleMobileWebAppTitle: "Lavinderia Support",
    themeColor: "#0f172a",
    manifestHref: "/support-lite-manifest.json",
    faviconHref: "/support-favicon.png",
    appleTouchIconHref: "/support-apple-touch-icon.png",
  });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 pt-6 pb-2 px-4">
        <img src={BUSINESS.logo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Lavinderia Support</h1>
          <p className="text-[0.6rem] text-muted-foreground leading-none">Customer Messages &amp; Complaints</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="inbox" className="text-xs gap-1.5">
              <MessageCircle className="h-4 w-4" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="complaints" className="text-xs gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Complaints
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inbox" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          <SupportInboxTab />
        </TabsContent>

        <TabsContent value="complaints" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          <SupportComplaintsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
