import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { MessageCircle, User, Phone, Package, Search, ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface WaMessage {
  id: string;
  phone: string;
  message: string;
  type: string;
  customer_id: string | null;
  order_id: string | null;
  wa_message_id: string | null;
  message_timestamp: string | null;
  created_at: string;
}

interface Conversation {
  phone: string;
  customerName: string | null;
  customerId: string | null;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: WaMessage[];
}

export default function WhatsAppInbox() {
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [customers, setCustomers] = useState<Record<string, { id: string; name: string; phone: string }>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [latestOrder, setLatestOrder] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch messages and customers
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [msgRes, custRes] = await Promise.all([
        supabase
          .from("whatsapp_messages")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase.from("customers").select("id, full_name, phone_number").eq("is_active", true),
      ]);

      if (msgRes.data) setMessages(msgRes.data as WaMessage[]);

      if (custRes.data) {
        const map: Record<string, { id: string; name: string; phone: string }> = {};
        for (const c of custRes.data) {
          const digits = c.phone_number.replace(/\D/g, "");
          map[digits] = { id: c.id, name: c.full_name, phone: c.phone_number };
          // Also map with country code
          if (digits.length === 8) {
            map["968" + digits] = { id: c.id, name: c.full_name, phone: c.phone_number };
          }
        }
        setCustomers(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as WaMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Build conversations
  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    for (const msg of messages) {
      const phone = msg.phone;
      if (!map.has(phone)) {
        const cust = customers[phone] || customers[phone.slice(-8)] || null;
        map.set(phone, {
          phone,
          customerName: cust?.name || null,
          customerId: cust?.id || msg.customer_id || null,
          lastMessage: msg.message,
          lastTime: msg.created_at,
          unreadCount: 0,
          messages: [],
        });
      }
      const conv = map.get(phone)!;
      conv.messages.push(msg);
      conv.lastMessage = msg.message;
      conv.lastTime = msg.created_at;
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    return arr;
  }, [messages, customers]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.phone.includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone);

  // Fetch latest order for selected conversation
  useEffect(() => {
    if (!selectedConversation?.customerId) {
      setLatestOrder(null);
      return;
    }
    supabase
      .from("orders")
      .select("id, order_number, current_status, total_amount, remaining_amount, payment_status")
      .eq("customer_id", selectedConversation.customerId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLatestOrder(data));
  }, [selectedConversation?.customerId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages.length]);

  const formatPhone = (phone: string) => {
    if (phone.length === 11 && phone.startsWith("968")) {
      return `+${phone.slice(0, 3)} ${phone.slice(3)}`;
    }
    return phone;
  };

  const showConversationList = !isMobile || !selectedPhone;
  const showChatView = !isMobile || !!selectedPhone;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="WhatsApp Inbox" />

      <div className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full">
        {/* Conversation List */}
        {showConversationList && (
          <div className={cn("border-r border-border flex flex-col", isMobile ? "w-full" : "w-[340px] shrink-0")}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Incoming WhatsApp messages will appear here</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.phone}
                    onClick={() => setSelectedPhone(conv.phone)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors",
                      selectedPhone === conv.phone && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {conv.customerName || formatPhone(conv.phone)}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conv.lastTime), { addSuffix: true })}
                          </span>
                        </div>
                        {conv.customerName && (
                          <span className="text-[11px] text-muted-foreground">{formatPhone(conv.phone)}</span>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>
        )}

        {/* Chat View */}
        {showChatView && (
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
                  {isMobile && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedPhone(null)}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedConversation.customerName || formatPhone(selectedConversation.phone)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatPhone(selectedConversation.phone)}</p>
                  </div>
                  {selectedConversation.customerId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => navigate(`/customer/${selectedConversation.customerId}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Profile
                    </Button>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3 max-w-[700px] mx-auto">
                    {selectedConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.type === "outgoing" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                            msg.type === "outgoing"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            msg.type === "outgoing" ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.message_timestamp || msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Bottom info panel */}
                <div className="border-t border-border p-3 bg-card">
                  <div className="flex items-center gap-4 flex-wrap">
                    {selectedConversation.customerId && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{selectedConversation.customerName || "Customer"}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{formatPhone(selectedConversation.phone)}</span>
                    </div>
                    {latestOrder && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          <span>{latestOrder.order_number}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {latestOrder.current_status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] gap-1 px-2"
                          onClick={() => navigate(`/order/${latestOrder.id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
