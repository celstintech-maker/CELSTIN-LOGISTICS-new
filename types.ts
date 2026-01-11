
export enum Role {
  SuperAdmin = 'Super Admin',
  Admin = 'Admin',
  Vendor = 'Vendor',
  Rider = 'Rider',
  Customer = 'Customer',
}

export enum DeliveryStatus {
  Pending = 'Pending',
  Assigned = 'Assigned',
  PickedUp = 'Picked Up',
  InProgress = 'In Progress',
  InTransit = 'In Transit',
  Completed = 'Completed',
  Delivered = 'Delivered',
  Failed = 'Failed',
}

export enum PaymentStatus {
  Unpaid = 'Unpaid',
  Paid = 'Paid',
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface Location {
    lat: number;
    lng: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  email?: string;
  pin?: string;
  bankDetails?: BankDetails;
  commissionBalance?: number; 
  totalWithdrawn?: number; 
  commissionRate?: number; 
  vehicle?: string;
  active?: boolean;
  location?: Location;
}

export interface PayoutNotification {
    id: string;
    amount: number;
    timestamp: Date;
    status: 'pending' | 'completed';
}

export interface CustomerInfo {
    id: string;
    name: string;
    phone: string;
}

export interface Delivery {
  id: string;
  customer: CustomerInfo;
  rider?: User;
  vendorId?: string; 
  pickupAddress: string;
  dropoffAddress: string;
  packageNotes: string;
  status: DeliveryStatus;
  paymentStatus: PaymentStatus;
  price: number;
  createdAt: any; 
}

export interface SystemSettings {
    businessName: string;
    businessAddress: string;
    heroTitle: string;
    heroSubtext: string;
    logoUrl: string;
    primaryColor: string;
    paymentAccountName: string;
    paymentAccountNumber: string;
    paymentBank: string;
    footerText: string;
    theme: 'light' | 'dark';
    standardCommissionRate: number;
    pricePerKm: number; 
}

export interface VendorPerformance {
  vendorId: string;
  totalOrders: number;
  completedOrders: number;
  onTimeRate: number;
}
