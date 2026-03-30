import { supabase } from "@/integrations/supabase/client";
import type { WorkflowOrder, WorkflowStatus, StatusChange, InternalNote } from "@/types/workflow";
import type { CustomerRecord, CustomerNote } from "@/types/customer";


// ─── Order with all relations ───

const ORDER_SELECT = `
  *,
  customers (id, full_name, phone_number, customer_type),
  order_items (*),
  order_status_history (*),
  internal_order_notes (*),
  payments (*)
`;

export function mapDbOrderToWorkflow(row: any): WorkflowOrder {
  const items = (row.order_items || []).map((i: any) => ({
    itemType: i.item_type || "",
    service: i.service_type || "",
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
    notes: i.special_notes || undefined,
    conditions: i.condition_notes ? i.condition_notes.split(",").filter(Boolean) : [],
  }));

  const statusHistory: StatusChange[] = (row.order_status_history || [])
    .sort((a: any, b: any) => a.changed_at.localeCompare(b.changed_at))
    .map((sh: any) => ({
      id: sh.id,
      orderId: sh.order_id,
      fromStatus: sh.from_status as WorkflowStatus | null,
      toStatus: sh.to_status as WorkflowStatus,
      changedAt: sh.changed_at,
      changedBy: sh.changed_by || undefined,
    }));

  const internalNotes: InternalNote[] = (row.internal_order_notes || []).map((n: any) => ({
    id: n.id,
    orderId: n.order_id,
    text: n.note_text,
    createdAt: n.created_at,
    createdBy: n.created_by || undefined,
  }));

  // Determine payment method from last payment or fallback
  const paymentMethod = row.employee_id || "cash";

  return {
    id: row.id,
    customerId: row.customer_id || undefined,
    orderNumber: row.order_number,
    customerName: row.customers?.full_name || "Walk-in",
    customerPhone: row.customers?.phone_number || "",
    orderDate: row.order_date,
    deliveryDate: row.delivery_date || "",
    orderType: row.order_type as "regular" | "urgent",
    pickupMethod: row.pickup_method as "walk-in" | "delivery" | "app",
    paymentStatus: row.payment_status as "unpaid" | "partially-paid" | "paid",
    paymentMethod,
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount),
    remainingBalance: Number(row.remaining_amount),
    itemCount: items.reduce((s: number, i: any) => s + i.quantity, 0),
    items,
    currentStatus: row.current_status as WorkflowStatus,
    statusUpdatedAt: row.updated_at,
    orderNotes: row.general_notes || undefined,
    statusHistory,
    internalNotes,
  };
}

export async function fetchAllOrders(includeDeleted = false): Promise<WorkflowOrder[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (!includeDeleted) {
    query = query.eq("is_deleted", false).eq("is_draft", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchAllOrders error:", error);
    return [];
  }
  return (data || []).map(mapDbOrderToWorkflow);
}

export async function softDeleteOrder(orderId: string): Promise<boolean> {
  const { error } = await supabase
    .from("orders")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) {
    console.error("softDeleteOrder error:", error);
    return false;
  }
  return true;
}

export async function bulkSoftDelete(filters: {
  draftsOnly?: boolean;
  beforeDate?: string;
  unpaidOnly?: boolean;
}): Promise<number> {
  let query = supabase
    .from("orders")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("is_deleted", false);

  if (filters.draftsOnly) {
    query = query.eq("is_draft", true);
  }
  if (filters.beforeDate) {
    query = query.lte("order_date", filters.beforeDate);
  }
  if (filters.unpaidOnly) {
    query = query.eq("payment_status", "unpaid");
  }

  const { data, error, count } = await query.select();
  if (error) {
    console.error("bulkSoftDelete error:", error);
    return 0;
  }
  return data?.length || 0;
}

export async function fetchOrderById(orderId: string): Promise<WorkflowOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbOrderToWorkflow(data);
}

export async function fetchOrderByNumber(orderNumber: string): Promise<WorkflowOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbOrderToWorkflow(data);
}

export async function searchOrderByCode(code: string): Promise<WorkflowOrder | null> {
  // Strip ORDER: prefix if present (QR codes store "ORDER:ORD-...")
  const cleaned = code.startsWith("ORDER:") ? code.slice(6) : code;

  // Try exact match on order_number first
  let order = await fetchOrderByNumber(cleaned);
  if (order) return order;

  // Try qr_value (try both with and without prefix)
  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("qr_value", `ORDER:${cleaned}`)
    .maybeSingle();

  if (data) return mapDbOrderToWorkflow(data);

  // Try partial match
  const { data: partialData } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .ilike("order_number", `%${cleaned}%`)
    .limit(1)
    .maybeSingle();

  if (partialData) return mapDbOrderToWorkflow(partialData);
  return null;
}

export async function updateOrderStatus(
  orderId: string,
  fromStatus: string | null,
  toStatus: WorkflowStatus,
  changedBy?: string
) {
  const { error: updateError } = await supabase
    .from("orders")
    .update({ current_status: toStatus })
    .eq("id", orderId);

  if (updateError) {
    console.error("updateOrderStatus error:", updateError);
    return false;
  }

  const { error: historyError } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: changedBy || "",
  });

  if (historyError) console.error("status history insert error:", historyError);
  return true;
}

export async function addInternalNote(orderId: string, text: string, createdBy?: string) {
  const { error } = await supabase.from("internal_order_notes").insert({
    order_id: orderId,
    note_text: text,
    created_by: createdBy || "",
  });
  if (error) console.error("addInternalNote error:", error);
  return !error;
}

export async function toggleOrderUrgent(orderId: string, currentType: string) {
  const newType = currentType === "urgent" ? "regular" : "urgent";
  const { error } = await supabase
    .from("orders")
    .update({ order_type: newType })
    .eq("id", orderId);
  if (error) console.error("toggleOrderUrgent error:", error);
  return !error;
}

// ─── Customers ───

export function mapDbCustomer(row: any, notes: any[] = []): CustomerRecord {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone_number,
    customerType: (row.customer_type || "Regular").toLowerCase() as "regular" | "vip",
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notes.map((n) => ({
      id: n.id,
      customerId: n.customer_id,
      text: n.note_text,
      createdAt: n.created_at,
      createdBy: n.created_by || undefined,
    })),
  };
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) console.error("deleteCustomer error:", error);
  return !error;
}

export async function archiveCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from("customers").update({ is_active: false } as any).eq("id", id);
  if (error) console.error("archiveCustomer error:", error);
  return !error;
}

export async function restoreCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from("customers").update({ is_active: true } as any).eq("id", id);
  if (error) console.error("restoreCustomer error:", error);
  return !error;
}

export async function customerHasOrders(customerId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  if (error) return true; // assume yes on error to be safe
  return (count || 0) > 0;
}

export async function fetchAllCustomers(): Promise<CustomerRecord[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_notes(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAllCustomers error:", error);
    return [];
  }

  return (data || []).map((row: any) => mapDbCustomer(row, row.customer_notes || []));
}

export async function fetchCustomerById(id: string): Promise<CustomerRecord | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_notes(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbCustomer(data, data.customer_notes || []);
}

export async function fetchCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_notes(*)")
    .eq("phone_number", phone)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbCustomer(data, data.customer_notes || []);
}

export async function fetchOrdersByCustomerId(customerId: string): Promise<WorkflowOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", customerId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchOrdersByCustomerId error:", error);
    return [];
  }
  return (data || []).map(mapDbOrderToWorkflow);
}

export async function addCustomerNote(customerId: string, text: string, createdBy?: string) {
  const { error } = await supabase.from("customer_notes").insert({
    customer_id: customerId,
    note_text: text,
    created_by: createdBy || "",
  });
  if (error) console.error("addCustomerNote error:", error);
  return !error;
}

export async function updateCustomerRecord(
  id: string,
  updates: { full_name?: string; phone_number?: string; customer_type?: string }
) {
  const { error } = await supabase.from("customers").update(updates).eq("id", id);
  if (error) console.error("updateCustomerRecord error:", error);
  return !error;
}

// ─── Order Creation ───

export function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${y}${m}${d}-${rand}`;
}

export async function createOrder(params: {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  orderType: string;
  pickupMethod: string;
  employeeId: string;
  orderNotes: string;
  items: {
    itemType: string;
    serviceId: string;
    quantity: number;
    unitPrice: number;
    color?: string;
    brand?: string;
    notes?: string;
    conditions: string[];
  }[];
  subtotal: number;
  urgentFee: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingBalance: number;
  paymentMethod: string;
  paymentStatus: string;
}) {
  const qrValue = `ORDER:${params.orderNumber}`;

  // Upsert customer
  let customerId = params.customerId;
  if (!customerId && params.customerPhone) {
    // Try to find existing
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_number", params.customerPhone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert({
          full_name: params.customerName || params.customerPhone || "Walk-in",
          phone_number: params.customerPhone,
        })
        .select("id")
        .single();

      if (custErr) {
        console.error("create customer error:", custErr);
        return { success: false, error: custErr.message };
      }
      customerId = newCust.id;
    }
  }

  // Create order
  const { data: orderData, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: params.orderNumber,
      customer_id: customerId,
      order_date: params.orderDate,
      delivery_date: params.deliveryDate || null,
      order_type: params.orderType,
      pickup_method: params.pickupMethod,
      current_status: "received",
      payment_status: params.paymentStatus,
      subtotal: params.subtotal,
      discount: params.discount,
      urgent_fee: params.urgentFee,
      tax: params.tax,
      total_amount: params.total,
      paid_amount: params.paidAmount,
      remaining_amount: params.remainingBalance,
      general_notes: params.orderNotes,
      qr_value: qrValue,
      employee_id: params.employeeId,
    })
    .select("id")
    .single();

  if (orderErr) {
    console.error("create order error:", orderErr);
    return { success: false, error: orderErr.message };
  }

  const orderId = orderData.id;

  // Create order items
  if (params.items.length > 0) {
    const itemRows = params.items.map((item) => {
      return {
        order_id: orderId,
        item_type: item.itemType,
        service_type: item.serviceId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
        color: item.color || "",
        brand: item.brand || "",
        condition_notes: item.conditions.join(","),
        special_notes: item.notes || "",
      };
    });

    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) console.error("create order items error:", itemsErr);
  }

  // Create initial status history
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: null,
    to_status: "received",
    changed_by: params.employeeId,
  });

  // Create payment record if paid
  if (params.paidAmount > 0) {
    await supabase.from("payments").insert({
      order_id: orderId,
      payment_method: params.paymentMethod,
      amount: params.paidAmount,
    });
  }

  return { success: true, orderId };
}
