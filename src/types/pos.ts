export interface Customer {
  id: string;
  phone: string;
  name: string;
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface GarmentCondition {
  id: string;
  label: string;
}

export interface OrderItem {
  id: string;
  itemType: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  color?: string;
  brand?: string;
  notes?: string;
  conditions: string[];
}

export type OrderType = "regular" | "urgent";
export type PickupMethod = "walk-in" | "delivery" | "app";
export type PaymentMethod = "cash" | "card" | "bank-transfer" | "partial" | "pay-later";
export type PaymentStatus = "unpaid" | "partially-paid" | "paid";

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerPhone: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  orderType: OrderType;
  pickupMethod: PickupMethod;
  employeeId?: string;
  orderNotes?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  urgentFee: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export const SERVICES: Service[] = [
  { id: "wash", name: "Wash Only", price: 1.0 },
  { id: "iron", name: "Iron Only", price: 0.75 },
  { id: "wash-iron", name: "Wash + Iron", price: 1.5 },
  { id: "dry-clean", name: "Dry Clean", price: 3.0 },
  { id: "special", name: "Special Cleaning", price: 5.0 },
  { id: "carpet", name: "Carpet Cleaning", price: 8.0 },
  { id: "blanket", name: "Blanket Cleaning", price: 6.0 },
];

export const ITEM_TYPES = [
  "Thobe", "Shirt", "Pants", "Jacket", "Suit", "Dress", "Skirt",
  "Coat", "Blanket", "Carpet", "Curtain", "Abaya", "Scarf", "Tie",
  "Jeans", "T-Shirt", "Sweater", "Underwear", "Socks", "Other",
];

export const GARMENT_CONDITIONS: GarmentCondition[] = [
  { id: "stain", label: "Stain Present" },
  { id: "old", label: "Old Garment" },
  { id: "sensitive", label: "Sensitive Fabric" },
  { id: "shrink", label: "May Shrink" },
  { id: "special-care", label: "Requires Special Care" },
  { id: "damaged-button", label: "Damaged Button" },
  { id: "broken-zipper", label: "Broken Zipper" },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "1", phone: "5550123", name: "John Doe", notes: "VIP customer" },
  { id: "2", phone: "5550456", name: "Sarah Ahmed" },
  { id: "3", phone: "5550789", name: "Ali Hassan", notes: "Prefers delivery" },
];

export const EMPLOYEES = [
  { id: "1", name: "Ahmad" },
  { id: "2", name: "Fatima" },
  { id: "3", name: "Omar" },
];
