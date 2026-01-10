
import { Role, User, Delivery, DeliveryStatus, PaymentStatus, VendorPerformance } from './types';

export const MOCK_USERS: User[] = [
  { id: 'user-0', name: 'CELSTIN TECH SUPPORT', phone: '08012345670', role: Role.SuperAdmin, email: 'support@celstin.com', pin: '1234' },
  { id: 'user-1', name: 'Admin Alice', phone: '08012345671', role: Role.Admin, email: 'alice@celstin.com', pin: '0000' },
  // Changed 'commission' to 'commissionBalance' to match the User interface in types.ts
  { id: 'user-2', name: 'Vendor Bob', phone: '08012345672', role: Role.Vendor, email: 'bob@vendor.com', pin: '1111', bankDetails: { bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Bob Vendor' }, commissionBalance: 0 },
  { id: 'user-3', name: 'Rider Charlie', phone: '08012345673', role: Role.Rider, pin: '2222', vehicle: 'Motorcycle', active: true, location: { lat: 6.2088, lng: 6.7222 } },
  { id: 'user-4', name: 'David Customer', phone: '08012345674', role: Role.Customer, email: 'david@customer.com', pin: '3333' },
  { id: 'user-5', name: 'Rider Diana', phone: '08012345675', role: Role.Rider, pin: '4444', vehicle: 'Van', active: false, location: { lat: 6.1895, lng: 6.7511 } },
  // Changed 'commission' to 'commissionBalance' to match the User interface in types.ts
  { id: 'user-6', name: 'Vendor Eve', phone: '08012345676', role: Role.Vendor, email: 'eve@vendor.com', pin: '5555', bankDetails: { bankName: 'First Bank', accountNumber: '0987654321', accountName: 'Eve Vendor' }, commissionBalance: 0 },
];

export const MOCK_CUSTOMERS = [
    { id: 'cust-1', name: 'Grace Hopper', phone: '09011223344' },
    { id: 'cust-2', name: 'Ada Lovelace', phone: '09022334455' },
    { id: 'cust-3', name: 'Margaret Hamilton', phone: '09033445566' },
];

export const MOCK_DELIVERIES: Delivery[] = [
  { id: 'del-101', customer: MOCK_CUSTOMERS[0], rider: MOCK_USERS[3], pickupAddress: '123 Cable Point, Asaba', dropoffAddress: '456 Nnebisi Road, Asaba', packageNotes: 'Fragile electronics', status: DeliveryStatus.InTransit, paymentStatus: PaymentStatus.Paid, price: 2100, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
  { id: 'del-102', customer: MOCK_CUSTOMERS[1], rider: MOCK_USERS[4], pickupAddress: '789 Okpanam Road, Asaba', dropoffAddress: '101 DLA Road, Asaba', packageNotes: 'Important documents', status: DeliveryStatus.Delivered, paymentStatus: PaymentStatus.Paid, price: 1800, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: 'del-103', customer: MOCK_CUSTOMERS[2], pickupAddress: '222 Summit Road, Asaba', dropoffAddress: '333 Dennis Osadebay Way, Asaba', packageNotes: 'Box of clothes', status: DeliveryStatus.Pending, paymentStatus: PaymentStatus.Unpaid, price: 1650, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: 'del-104', customer: MOCK_CUSTOMERS[0], rider: MOCK_USERS[3], pickupAddress: '555 DBS Road, Asaba', dropoffAddress: '666 Mariam Babangida Way, Asaba', packageNotes: 'Food items', status: DeliveryStatus.Assigned, paymentStatus: PaymentStatus.Unpaid, price: 1950, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
];

export const MOCK_VENDORS_PERFORMANCE: VendorPerformance[] = [
    { vendorId: 'user-2', totalOrders: 50, completedOrders: 48, onTimeRate: 96 },
    { vendorId: 'user-6', totalOrders: 75, completedOrders: 70, onTimeRate: 93 },
];

export const NIGERIAN_BANKS: string[] = [
  "Access Bank", "Citibank", "Diamond Bank", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank", "Globus Bank", "Guaranty Trust Bank",
  "Heritage Bank", "Jaiz Bank", "Keystone Bank", "Moniepoint MFB", "Parallex Bank", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank",
  "SunTrust Bank", "TAJBank", "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa",
  "Unity Bank", "Wema Bank", "Zenith Bank"
];