import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, AlertTriangle, Settings } from "lucide-react";
import { useStandaloneAppMeta } from "@/hooks/useStandaloneAppMeta";
import { BUSINESS } from "@/lib/business-config";
import { useBadgeCount } from "@/hooks/useBadgeCount";
import SupportInboxTab from "@/components/support-lite/SupportInboxTab";
import SupportComplaintsTab from "@/components/support-lite/SupportComplaintsTab";
import NotificationSettings from "@/components/support-lite/NotificationSettings";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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

  // Badge count integration — keeps home screen icon badge updated
  useBadgeCount();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pt-6 pb-2 px-4">
        <div className="flex items-center gap-3">
          <img src={BUSINESS.logo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Lavinderia Support</h1>
            <p className="text-[0.6rem] text-muted-foreground leading-none">Customer Messages &amp; Complaints</p>
          </div>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4.5 w-4.5 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-base">Support Settings</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <NotificationSettings />
            </div>
          </SheetContent>
        </Sheet>
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
