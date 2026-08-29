import { apiClient } from "./client";
import type { PaymentMethod } from "@/types/membership";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiListEnvelope<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface DashboardStats {
  revenue: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  lowStock: { _id: string; name: string; slug: string; sizes: { size: string; stock: number }[] }[];
  topProducts: {
    _id: string;
    name: string;
    slug: string;
    image: string | null;
    quantitySold: number;
    revenue: number;
  }[];
}

export async function getDashboard(): Promise<DashboardStats> {
  const res = await apiClient.get<ApiEnvelope<DashboardStats>>("/admin/dashboard");
  return res.data.data;
}

export interface GymDashboardStats {
  activeMembers: number;
  newMembersThisMonth: number;
  newMembersLastMonth: number;
  expiringSoon: Array<{
    _id: string;
    endsAt: string;
    planSnapshot: { name: string };
    member: { _id: string; firstName: string; lastName: string; email: string } | null;
  }>;
  revenueThisMonthMinorUnits: number;
  todaysBookingCount: number;
  classFillRateToday: number | null;
  openEnquiries: number;
}

export async function getGymDashboard(): Promise<GymDashboardStats> {
  const res = await apiClient.get<ApiEnvelope<GymDashboardStats>>("/admin/dashboard/gym");
  return res.data.data;
}

export interface FunnelInsights {
  days: number;
  funnel: {
    reserveStarts: number;
    whatsappClicks: number;
    reservations: number;
    converted: number;
    startToReservePct: number | null;
    reserveToPaidPct: number | null;
  };
  atRisk: {
    count: number;
    totalMinorUnits: number;
    buckets: Array<{ _id: number | string; count: number; total: number }>;
    oldest: Array<{
      invoiceId: string;
      invoiceNumber: string;
      totalMinorUnits: number;
      paymentMethod: PaymentMethod;
      ageDays: number;
      referenceCode: string | null;
      planName: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    }>;
  };
}

export async function getFunnelInsights(days = 30): Promise<FunnelInsights> {
  const res = await apiClient.get<ApiEnvelope<FunnelInsights>>("/admin/dashboard/funnel", {
    params: { days },
  });
  return res.data.data;
}

export interface StaffAccount {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export async function getStaff(): Promise<StaffAccount[]> {
  const res = await apiClient.get<ApiEnvelope<StaffAccount[]>>("/admin/staff");
  return res.data.data;
}

// The password comes back exactly once, on create and on reset. It is never
// stored in the clear, so if it is lost the only path is another reset.
export async function createStaff(input: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<StaffAccount & { password: string }> {
  const res = await apiClient.post<ApiEnvelope<StaffAccount & { password: string }>>(
    "/admin/staff",
    input
  );
  return res.data.data;
}

export async function resetStaffPassword(id: string): Promise<{ password: string }> {
  const res = await apiClient.post<ApiEnvelope<{ password: string }>>(
    `/admin/staff/${id}/reset-password`
  );
  return res.data.data;
}

export async function setStaffActive(id: string, isActive: boolean): Promise<void> {
  await apiClient.patch(`/admin/staff/${id}`, { isActive });
}

export interface Customer {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  authProvider: "local" | "google";
  createdAt: string;
}

export async function getCustomers(
  params: { q?: string; page?: number; limit?: number } = {},
): Promise<{ items: Customer[]; pagination: ApiListEnvelope<Customer>["pagination"] }> {
  const res = await apiClient.get<ApiListEnvelope<Customer>>("/admin/customers", { params });
  return { items: res.data.data, pagination: res.data.pagination };
}

export interface CustomerProfile extends Customer {
  phone: string | null;
}

export async function getCustomer(id: string): Promise<CustomerProfile> {
  const res = await apiClient.get<ApiEnvelope<CustomerProfile>>(`/admin/customers/${id}`);
  return res.data.data;
}

export interface AuditLogEntry {
  _id: string;
  admin: string | null;
  adminEmail: string | null;
  action: string;
  params: unknown;
  body: unknown;
  resultSummary: { id?: string; count?: number } | null;
  createdAt: string;
}

export async function getAuditLog(
  params: { action?: string; page?: number; limit?: number } = {},
): Promise<{ items: AuditLogEntry[]; pagination: ApiListEnvelope<AuditLogEntry>["pagination"] }> {
  const res = await apiClient.get<ApiListEnvelope<AuditLogEntry>>("/admin/audit-log", { params });
  return { items: res.data.data, pagination: res.data.pagination };
}
