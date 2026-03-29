import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageCircle, User, Search, ArrowLeft, Send, Loader2,
  Image as ImageIcon, FileText, Mic, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WaMessage {
  id: string;
  phone: string;
  message: string;
  type: string;
  message_type: string;
  media_id: string | null;
  media_url: string | null;
  filename: string | null;
  customer_id: string | null;
  order_id: string | null;
  wa_message_id: string | null;
  message_timestamp: string | null;
  created_at: string;
  is_deleted: boolean;
  send_status: string;
  is_read: boolean;
}

interface Conversation {
  phone: string;
  customerName: string | null;
  customerId: string | null;
  lastMessage: string;
  lastTime: string;
  messages: WaMessage[];
  unreadCount: number;
}

export default function SupportInboxTab() {
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [customers, setCustomers] = useState<Record<string, { id: string; name: string; phone: string }>>({});
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [msgRes, custRes] = await Promise.all([
        supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("is_deleted", false)
          .order("created_at", { ascending: true }),
        supabase.from("customers").select("id, full_name, phone_number").eq("is_active", true),
      ]);
      if (msgRes.data) setMessages(msgRes.data as WaMessage[]);
      if (custRes.data) {
        const map: Record<string, { id: string; name: string; phone: string }> = {};
        for (const c of custRes.data) {
          const digits = c.phone_number.replace(/\D/g, "");
          map[digits] = { id: c.id, name: c.full_name, phone: c.phone_number };
          if (digits.length === 8) map["968" + digits] = { id: c.id, name: c.full_name, phone: c.phone_number };
        }
        setCustomers(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("support-inbox-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as WaMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    for (const msg of messages) {
      if (!map.has(msg.phone)) {
        const cust = customers[msg.phone] || customers[msg.phone.slice(-8)] || null;
        map.set(msg.phone, {
          phone: msg.phone,
          customerName: cust?.name || null,
          customerId: cust?.id || msg.customer_id || null,
          lastMessage: msg.message,
          lastTime: msg.created_at,
          messages: [],
          unreadCount: 0,
        });
      }
      const conv = map.get(msg.phone)!;
      conv.messages.push(msg);
      conv.lastMessage = msg.message;
      conv.lastTime = msg.created_at;
      if (msg.type === "incoming" && !msg.is_read) conv.unreadCount++;
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    return arr;
  }, [messages, customers]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.phone.includes(q) || c.customerName?.toLowerCase().includes(q));
  }, [conversations, search]);

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone);

  useEffect(() => {
    if (!selectedConversation) return;
    const unreadIds = selectedConversation.messages.filter((m) => m.type === "incoming" && !m.is_read).map((m) => m.id);
    if (!unreadIds.length) return;
    setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)));
    supabase.from("whatsapp_messages").update({ is_read: true } as any).in("id", unreadIds).then(() => {});
  }, [selectedPhone, selectedConversation?.messages.length]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedConversation?.messages.length]);
  useEffect(() => { if (selectedPhone) setTimeout(() => replyInputRef.current?.focus(), 100); }, [selectedPhone]);

  const formatPhone = (phone: string) => {
    if (phone.length === 11 && phone.startsWith("968")) return `+${phone.slice(0, 3)} ${phone.slice(3)}`;
    return phone;
  };

  const handleSend = async () => {
    if (!replyText.trim() || !selectedPhone || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-text", {
        body: { phone: selectedPhone, message: replyText.trim(), customer_id: selectedConversation?.customerId || null },
      });
      if (error) throw error;
      if (data?.success) { setReplyText(""); toast.success("Message sent"); }
      else toast.error(data?.error || "Failed to send");
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const renderMessageContent = (msg: WaMessage) => {
    if (msg.message_type === "image") {
      return (
        <div>
          {msg.media_url ? (
            <button onClick={() => setPreviewImage(msg.media_url)} className="block">
              <div className="rounded overflow-hidden mb-1 max-w-[200px]">
                <img src={msg.media_url} alt="Shared image" className="w-full h-auto rounded object-cover max-h-[200px]" />
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs opacity-70 p-2 bg-muted/30 rounded mb-1">
              <ImageIcon className="h-4 w-4" /><span>Image (media expired)</span>
            </div>
          )}
          {msg.message && msg.message !== "[Image]" && <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>}
        </div>
      );
    }
    if (msg.message_type === "audio") {
      return (
        <div className="flex items-center gap-2 py-1">
          <Mic className="h-4 w-4 shrink-0" />
          {msg.media_url ? <audio controls preload="none" className="h-8 max-w-[200px]"><source src={msg.media_url} /></audio>
            : <span className="text-xs opacity-70">Voice note (media expired)</span>}
        </div>
      );
    }
    if (msg.message_type === "document") {
      return (
        <div className="flex items-center gap-2 py-1">
          <FileText className="h-4 w-4 shrink-0" />
          {msg.media_url ? <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="text-sm underline truncate max-w-[180px]">{msg.filename || "Document"}</a>
            : <span className="text-sm">{msg.filename || "Document"} <span className="text-xs opacity-70">(expired)</span></span>}
        </div>
      );
    }
    return <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>;
  };

  // Mobile: show list or chat
  if (selectedPhone && selectedConversation) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedPhone(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedConversation.customerName || formatPhone(selectedConversation.phone)}</p>
            <p className="text-[11px] text-muted-foreground">{formatPhone(selectedConversation.phone)}</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 max-w-[700px] mx-auto">
            {selectedConversation.messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.type === "outgoing" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-lg px-3 py-2", msg.type === "outgoing" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                  {renderMessageContent(msg)}
                  <div className="flex items-center gap-1 mt-1">
                    <span className={cn("text-[10px]", msg.type === "outgoing" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {format(new Date(msg.message_timestamp || msg.created_at), "HH:mm")}
                    </span>
                    {msg.type === "outgoing" && msg.send_status === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Reply */}
        <div className="border-t border-border p-3 bg-card">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
            <Input ref={replyInputRef} placeholder="Type a message..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="flex-1 h-10 text-base" disabled={sending} />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!replyText.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            {previewImage && <img src={previewImage} alt="Media" className="w-full h-full object-contain rounded" />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-base" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No messages yet</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.phone}
              onClick={() => { setSelectedPhone(conv.phone); setReplyText(""); }}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors",
                conv.unreadCount > 0 && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", conv.unreadCount > 0 ? "bg-primary/20" : "bg-primary/10")}>
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-bold" : "font-medium")}>
                      {conv.customerName || formatPhone(conv.phone)}
                    </span>
                    <span className={cn("text-[10px] shrink-0 ml-2", conv.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {formatDistanceToNow(new Date(conv.lastTime), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={cn("text-xs truncate", conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px] bg-primary text-primary-foreground shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
