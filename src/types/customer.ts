import type { WorkflowOrder } from "./workflow";

export type CustomerType = "regular" | "vip";

export interface CustomerNote {
  id: string;
  customerId: string;
  text: string;
  createdAt: string;
  createdBy?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  customerType: CustomerType;
  createdAt: string;
  updatedAt: string;
  notes: CustomerNote[];
}

export interface CustomerWithStats extends CustomerRecord {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
  totalPaid: number;
  outstandingBalance: number;
  unpaidOrderCount: number;
  partiallyPaidOrderCount: number;
  lastOrderDate: string | null;
  orders: WorkflowOrder[];
}

function rid() {
  return Math.random().toString(36).substring(2, 10);
}

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

export const MOCK_CUSTOMERS_DB: CustomerRecord[] = [
  { id: "c1", name: "John Doe", phone: "5550123", customerType: "vip", createdAt: "2025-01-10", updatedAt: today, notes: [{ id: rid(), customerId: "c1", text: "VIP customer — always prioritize", createdAt: "2025-01-10", createdBy: "Ahmad" }] },
  { id: "c2", name: "Sarah Ahmed", phone: "5550456", customerType: "regular", createdAt: "2025-02-15", updatedAt: today, notes: [] },
  { id: "c3", name: "Ali Hassan", phone: "5550789", customerType: "regular", createdAt: "2025-03-01", updatedAt: yesterday, notes: [{ id: rid(), customerId: "c3", text: "Prefers delivery — call before dispatching", createdAt: "2025-03-01", createdBy: "Fatima" }] },
  { id: "c4", name: "Fatima Al-Rashid", phone: "5551234", customerType: "vip", createdAt: "2025-01-20", updatedAt: yesterday, notes: [{ id: rid(), customerId: "c4", text: "Sensitive about perfume — use unscented detergent", createdAt: "2025-02-10", createdBy: "Omar" }] },
  { id: "c5", name: "Mohammed Khalid", phone: "5559876", customerType: "regular", createdAt: "2025-04-05", updatedAt: twoDaysAgo, notes: [] },
  { id: "c6", name: "Layla Noor", phone: "5554321", customerType: "regular", createdAt: "2025-05-12", updatedAt: twoDaysAgo, notes: [] },
  { id: "c7", name: "Omar Farooq", phone: "5557890", customerType: "regular", createdAt: "2025-06-01", updatedAt: today, notes: [] },
  { id: "c8", name: "Nadia Salim", phone: "5552468", customerType: "vip", createdAt: "2025-02-28", updatedAt: today, notes: [{ id: rid(), customerId: "c8", text: "Prefers express service when available", createdAt: "2025-03-15", createdBy: "Ahmad" }] },
];
