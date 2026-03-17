export type WorkflowStatus =
  | "received"
  | "washing"
  | "drying"
  | "ironing"
  | "ready-for-pickup"
  | "delivered";

export const WORKFLOW_STAGES: { id: WorkflowStatus; label: string; icon: string }[] = [
  { id: "received", label: "Received", icon: "inbox" },
  { id: "washing", label: "Washing", icon: "droplets" },
  { id: "drying", label: "Drying", icon: "wind" },
  { id: "ironing", label: "Ironing", icon: "flame" },
  { id: "ready-for-pickup", label: "Ready for Pickup", icon: "package-check" },
  { id: "delivered", label: "Delivered", icon: "truck" },
];

export interface StatusChange {
  id: string;
  orderId: string;
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus;
  changedAt: string;
  changedBy?: string;
}

export interface InternalNote {
  id: string;
  orderId: string;
  text: string;
  createdAt: string;
  createdBy?: string;
}

export interface WorkflowOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  orderType: "regular" | "urgent";
  pickupMethod: "walk-in" | "delivery" | "app";
  paymentStatus: "unpaid" | "partially-paid" | "paid";
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  itemCount: number;
  items: {
    itemType: string;
    service: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    conditions: string[];
  }[];
  currentStatus: WorkflowStatus;
  statusUpdatedAt: string;
  orderNotes?: string;
  statusHistory: StatusChange[];
  internalNotes: InternalNote[];
}

function randomId() {
  return Math.random().toString(36).substring(2, 10);
}

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

export const MOCK_WORKFLOW_ORDERS: WorkflowOrder[] = [
  {
    id: "w1", orderNumber: "ORD-250316-1001", customerName: "John Doe", customerPhone: "5550123",
    orderDate: today, deliveryDate: tomorrow, orderType: "regular", pickupMethod: "walk-in",
    paymentStatus: "paid", paymentMethod: "cash", totalAmount: 12.0, paidAmount: 12.0, remainingBalance: 0,
    itemCount: 4, items: [
      { itemType: "Thobe", service: "Wash + Iron", quantity: 2, unitPrice: 1.5, conditions: [] },
      { itemType: "Shirt", service: "Iron Only", quantity: 2, unitPrice: 0.75, conditions: ["stain"] },
    ],
    currentStatus: "received", statusUpdatedAt: today, orderNotes: "VIP customer",
    statusHistory: [{ id: randomId(), orderId: "w1", fromStatus: null, toStatus: "received", changedAt: today, changedBy: "Ahmad" }],
    internalNotes: [],
  },
  {
    id: "w2", orderNumber: "ORD-250316-1002", customerName: "Sarah Ahmed", customerPhone: "5550456",
    orderDate: today, deliveryDate: today, orderType: "urgent", pickupMethod: "delivery",
    paymentStatus: "partially-paid", paymentMethod: "card", totalAmount: 25.5, paidAmount: 10.0, remainingBalance: 15.5,
    itemCount: 5, items: [
      { itemType: "Suit", service: "Dry Clean", quantity: 1, unitPrice: 3.0, conditions: ["sensitive"] },
      { itemType: "Dress", service: "Special Cleaning", quantity: 2, unitPrice: 5.0, conditions: [] },
      { itemType: "Scarf", service: "Wash Only", quantity: 2, unitPrice: 1.0, conditions: [] },
    ],
    currentStatus: "washing", statusUpdatedAt: today,
    statusHistory: [
      { id: randomId(), orderId: "w2", fromStatus: null, toStatus: "received", changedAt: yesterday, changedBy: "Fatima" },
      { id: randomId(), orderId: "w2", fromStatus: "received", toStatus: "washing", changedAt: today, changedBy: "Ahmad" },
    ],
    internalNotes: [{ id: randomId(), orderId: "w2", text: "Stain treatment applied to suit", createdAt: today, createdBy: "Ahmad" }],
  },
  {
    id: "w3", orderNumber: "ORD-250315-0998", customerName: "Ali Hassan", customerPhone: "5550789",
    orderDate: yesterday, deliveryDate: today, orderType: "regular", pickupMethod: "walk-in",
    paymentStatus: "unpaid", paymentMethod: "pay-later", totalAmount: 18.0, paidAmount: 0, remainingBalance: 18.0,
    itemCount: 6, items: [
      { itemType: "Blanket", service: "Blanket Cleaning", quantity: 2, unitPrice: 6.0, conditions: ["old"] },
      { itemType: "Curtain", service: "Wash + Iron", quantity: 4, unitPrice: 1.5, conditions: [] },
    ],
    currentStatus: "drying", statusUpdatedAt: today,
    statusHistory: [
      { id: randomId(), orderId: "w3", fromStatus: null, toStatus: "received", changedAt: yesterday },
      { id: randomId(), orderId: "w3", fromStatus: "received", toStatus: "washing", changedAt: yesterday },
      { id: randomId(), orderId: "w3", fromStatus: "washing", toStatus: "drying", changedAt: today },
    ],
    internalNotes: [],
  },
  {
    id: "w4", orderNumber: "ORD-250315-0999", customerName: "Fatima Al-Rashid", customerPhone: "5551234",
    orderDate: yesterday, deliveryDate: today, orderType: "urgent", pickupMethod: "app",
    paymentStatus: "paid", paymentMethod: "bank-transfer", totalAmount: 9.0, paidAmount: 9.0, remainingBalance: 0,
    itemCount: 3, items: [
      { itemType: "Abaya", service: "Special Cleaning", quantity: 1, unitPrice: 5.0, conditions: ["sensitive", "special-care"] },
      { itemType: "Scarf", service: "Wash + Iron", quantity: 2, unitPrice: 1.5, conditions: [] },
    ],
    currentStatus: "ironing", statusUpdatedAt: today,
    statusHistory: [
      { id: randomId(), orderId: "w4", fromStatus: null, toStatus: "received", changedAt: yesterday },
      { id: randomId(), orderId: "w4", fromStatus: "received", toStatus: "washing", changedAt: yesterday },
      { id: randomId(), orderId: "w4", fromStatus: "washing", toStatus: "drying", changedAt: yesterday },
      { id: randomId(), orderId: "w4", fromStatus: "drying", toStatus: "ironing", changedAt: today },
    ],
    internalNotes: [{ id: randomId(), orderId: "w4", text: "Customer requested extra care for abaya", createdAt: yesterday, createdBy: "Fatima" }],
  },
  {
    id: "w5", orderNumber: "ORD-250314-0990", customerName: "Mohammed Khalid", customerPhone: "5559876",
    orderDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], deliveryDate: yesterday, orderType: "regular", pickupMethod: "walk-in",
    paymentStatus: "paid", paymentMethod: "cash", totalAmount: 4.5, paidAmount: 4.5, remainingBalance: 0,
    itemCount: 3, items: [
      { itemType: "Shirt", service: "Wash + Iron", quantity: 3, unitPrice: 1.5, conditions: [] },
    ],
    currentStatus: "ready-for-pickup", statusUpdatedAt: today, orderNotes: "Overdue - customer not responding",
    statusHistory: [
      { id: randomId(), orderId: "w5", fromStatus: null, toStatus: "received", changedAt: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0] },
      { id: randomId(), orderId: "w5", fromStatus: "received", toStatus: "washing", changedAt: yesterday },
      { id: randomId(), orderId: "w5", fromStatus: "washing", toStatus: "drying", changedAt: yesterday },
      { id: randomId(), orderId: "w5", fromStatus: "drying", toStatus: "ironing", changedAt: yesterday },
      { id: randomId(), orderId: "w5", fromStatus: "ironing", toStatus: "ready-for-pickup", changedAt: today },
    ],
    internalNotes: [],
  },
  {
    id: "w6", orderNumber: "ORD-250314-0985", customerName: "Layla Noor", customerPhone: "5554321",
    orderDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], deliveryDate: yesterday, orderType: "regular", pickupMethod: "delivery",
    paymentStatus: "paid", paymentMethod: "card", totalAmount: 6.0, paidAmount: 6.0, remainingBalance: 0,
    itemCount: 2, items: [
      { itemType: "Jacket", service: "Dry Clean", quantity: 2, unitPrice: 3.0, conditions: [] },
    ],
    currentStatus: "delivered", statusUpdatedAt: today,
    statusHistory: [
      { id: randomId(), orderId: "w6", fromStatus: null, toStatus: "received", changedAt: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0] },
      { id: randomId(), orderId: "w6", fromStatus: "received", toStatus: "washing", changedAt: yesterday },
      { id: randomId(), orderId: "w6", fromStatus: "washing", toStatus: "drying", changedAt: yesterday },
      { id: randomId(), orderId: "w6", fromStatus: "drying", toStatus: "ironing", changedAt: yesterday },
      { id: randomId(), orderId: "w6", fromStatus: "ironing", toStatus: "ready-for-pickup", changedAt: today },
      { id: randomId(), orderId: "w6", fromStatus: "ready-for-pickup", toStatus: "delivered", changedAt: today },
    ],
    internalNotes: [],
  },
  {
    id: "w7", orderNumber: "ORD-250316-1003", customerName: "Omar Farooq", customerPhone: "5557890",
    orderDate: today, deliveryDate: tomorrow, orderType: "regular", pickupMethod: "walk-in",
    paymentStatus: "unpaid", paymentMethod: "pay-later", totalAmount: 8.0, paidAmount: 0, remainingBalance: 8.0,
    itemCount: 4, items: [
      { itemType: "Pants", service: "Wash + Iron", quantity: 2, unitPrice: 1.5, conditions: [] },
      { itemType: "Jeans", service: "Wash Only", quantity: 2, unitPrice: 1.0, conditions: ["stain"] },
    ],
    currentStatus: "received", statusUpdatedAt: today,
    statusHistory: [{ id: randomId(), orderId: "w7", fromStatus: null, toStatus: "received", changedAt: today }],
    internalNotes: [],
  },
  {
    id: "w8", orderNumber: "ORD-250316-1004", customerName: "Nadia Salim", customerPhone: "5552468",
    orderDate: today, deliveryDate: today, orderType: "urgent", pickupMethod: "walk-in",
    paymentStatus: "paid", paymentMethod: "cash", totalAmount: 15.0, paidAmount: 15.0, remainingBalance: 0,
    itemCount: 3, items: [
      { itemType: "Suit", service: "Dry Clean", quantity: 1, unitPrice: 3.0, conditions: ["sensitive"] },
      { itemType: "Shirt", service: "Wash + Iron", quantity: 2, unitPrice: 1.5, conditions: [] },
    ],
    currentStatus: "washing", statusUpdatedAt: today,
    statusHistory: [
      { id: randomId(), orderId: "w8", fromStatus: null, toStatus: "received", changedAt: today },
      { id: randomId(), orderId: "w8", fromStatus: "received", toStatus: "washing", changedAt: today },
    ],
    internalNotes: [],
  },
];
