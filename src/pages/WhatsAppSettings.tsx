import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";

interface NotificationLog {
  id: string;
  created_at: string;
  recipient_phone: string;
  message_type: string;
  message_body: string | null;
  send_status: string;
  error_message: string | null;
  provider_message_id: string | null;
  order_id: string;
}

const WhatsAppSettings = () => {
  const [testPhone, setTestPhone] = useState("968");
  const [testName, setTestName] = useState("Saqer");
  const [testOrderNumber, setTestOrderNumber] = useState("ORD-12345");
  const [testAmount, setTestAmount] = useState("5.200");
  const [templateName, setTemplateName] = useState("order_ready_pdf_ar");
  const [templateLang, setTemplateLang] = useState("ar");
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [productionMode, setProductionMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [tokenAlert, setTokenAlert] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("notification_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs((data as unknown as NotificationLog[]) || []);
    }
    setLoadingLogs(false);
  };

  const handleSendTest = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Enter a valid phone number with country code (e.g. 96812345678)");
      return;
    }

    setSending(true);
    setTokenAlert(false);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          customer_phone: testPhone,
          customer_name: testName,
          order_number: testOrderNumber,
          total_amount: parseFloat(testAmount),
          remaining_amount: 0,
          message_type: "ready_for_pickup",
          template_name: templateName,
          template_language: templateLang,
          is_test: true,
        },
      });

      if (error) {
        toast.error(`Failed to invoke: ${error.message}`);
        return;
      }

      const result = data as {
        success: boolean;
        status: string;
        error?: string;
        is_token_error?: boolean;
        message_id?: string;
      };

      if (result.success) {
        toast.success(`✅ Message sent! ID: ${result.message_id}`);
      } else {
        if (result.is_token_error) {
          setTokenAlert(true);
          toast.error("🔑 Token expired! Please refresh your WhatsApp access token.");
        } else {
          toast.error(`❌ Failed: ${result.error}`);
        }
      }

      // Refresh logs
      await fetchLogs();
    } catch (err) {
      toast.error(`Error: ${String(err)}`);
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "skipped":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Skipped</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="WhatsApp Settings"
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="prod-mode" className="text-sm text-muted-foreground">
              Production Mode
            </Label>
            <Switch
              id="prod-mode"
              checked={productionMode}
              onCheckedChange={setProductionMode}
            />
            <Badge variant={productionMode ? "default" : "secondary"}>
              {productionMode ? "ON" : "OFF"}
            </Badge>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Token Alert */}
        {tokenAlert && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">WhatsApp Access Token Expired</p>
                <p className="text-sm text-muted-foreground">
                  Your token needs to be refreshed. Go to Meta Business Manager → WhatsApp → API Setup to generate a new token, then update it in your backend secrets.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Production Mode Warning */}
        {!productionMode && (
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">Testing Mode Active</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Messages are only sent manually from this page. Automatic workflow triggers are disabled.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Test Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test WhatsApp Message
            </CardTitle>
            <CardDescription>
              Send a test template message to verify your WhatsApp Business integration works.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone">Recipient Phone</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="96812345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-name">Customer Name</Label>
                <Input
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Saqer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-order">Order Number</Label>
                <Input
                  id="test-order"
                  value={testOrderNumber}
                  onChange={(e) => setTestOrderNumber(e.target.value)}
                  placeholder="ORD-12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-amount">Total Amount (OMR)</Label>
                <Input
                  id="test-amount"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  placeholder="5.200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="order_ready"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-lang">Template Language</Label>
                <Input
                  id="template-lang"
                  value={templateLang}
                  onChange={(e) => setTemplateLang(e.target.value)}
                  placeholder="ar"
                />
              </div>
            </div>

            <Button
              onClick={handleSendTest}
              disabled={sending}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test WhatsApp Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Message Logs</CardTitle>
                <CardDescription>Recent WhatsApp message attempts and their status</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs}>
                <RefreshCw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No messages sent yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    {statusIcon(log.send_status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(log.send_status)}
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.recipient_phone}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.message_type}
                        </Badge>
                      </div>
                      {log.message_body && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {log.message_body}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.provider_message_id && (
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            ID: {log.provider_message_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
