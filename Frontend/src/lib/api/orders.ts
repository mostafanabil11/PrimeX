import { apiClient } from "./client";
import type { Order, OrderSummary } from "@/types/order";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CheckoutResponse {
  order: Order;
  // Returned only for guest orders — the one-time credential that lets this
  // browser read the order it just placed. Stashed in sessionStorage below.
  guestAccessToken?: string;
  // Present only for card orders — the fully-formed provider URL to embed.
  // The frontend never builds this URL itself, so provider details stay
  // server-side and can change without a frontend release.
  payment?: {
    iframeUrl: string;
    expiresAt: string;
  };
}

export interface GuestShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  governorate: string;
  postalCode?: string | null;
}

export interface CheckoutInput {
  idempotencyKey: string;
  paymentMethod: "cod" | "card";
  couponCode?: string | null;
  // Signed-in: pick a saved address, cart comes from the server.
  addressId?: string | null;
  // Guest: contact + address typed inline, cart lines sent along. The server
  // re-prices every line regardless, so these are a statement of intent only.
  email?: string | null;
  shippingAddress?: GuestShippingAddress | null;
  items?: { productId: string; size: string; quantity: number }[];
}

export async function checkout(input: CheckoutInput): Promise<CheckoutResponse> {
  const res = await apiClient.post<
    ApiEnvelope<Order> & {
      guestAccessToken?: string;
      payment?: { iframeUrl: string; expiresAt: string };
    }
  >("/orders/checkout", {
    idempotencyKey: input.idempotencyKey,
    paymentMethod: input.paymentMethod,
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    ...(input.addressId
      ? { addressId: input.addressId }
      : {
          email: input.email,
          shippingAddress: input.shippingAddress,
          items: input.items,
        }),
  });

  if (res.data.guestAccessToken) {
    rememberOrderToken(res.data.data.orderNumber, res.data.guestAccessToken);
  }

  return {
    order: res.data.data,
    guestAccessToken: res.data.guestAccessToken,
    payment: res.data.payment,
  };
}

// --- Guest order access ---
//
// The token proves "this browser is the one that placed that order". Kept in
// sessionStorage rather than a cookie or the URL: it should not survive the
// tab, be sent on unrelated requests, or end up in a shared link or a
// referrer header. A guest who loses it falls back to the email lookup below.

const TOKEN_KEY_PREFIX = "valiant:order-token:";

export function rememberOrderToken(orderNumber: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${TOKEN_KEY_PREFIX}${orderNumber}`, token);
  } catch {
    // Private-browsing modes can refuse sessionStorage writes. Losing the
    // token is recoverable (email lookup), so this must never break checkout.
  }
}

export function getOrderToken(orderNumber: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(`${TOKEN_KEY_PREFIX}${orderNumber}`);
  } catch {
    return null;
  }
}

// Sent on every order read. Harmless when absent (a signed-in customer is
// authorised by their session cookie instead).
function orderTokenHeaders(orderNumber: string): Record<string, string> {
  const token = getOrderToken(orderNumber);
  return token ? { "x-order-token": token } : {};
}

export async function lookupOrder(orderNumber: string, email: string): Promise<Order> {
  const res = await apiClient.post<ApiEnvelope<Order>>("/orders/lookup", { orderNumber, email });
  return res.data.data;
}

export interface PaymentStatus {
  orderNumber: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  fulfillmentStatus: string;
  expiresAt: string | null;
}

export async function getPaymentStatus(orderNumber: string): Promise<PaymentStatus> {
  const res = await apiClient.get<ApiEnvelope<PaymentStatus>>(`/orders/${orderNumber}/payment-status`, {
    headers: orderTokenHeaders(orderNumber),
  });
  return res.data.data;
}

export async function getOrders(): Promise<OrderSummary[]> {
  const res = await apiClient.get<ApiEnvelope<OrderSummary[]>>("/orders");
  return res.data.data;
}

export async function getOrder(orderNumber: string): Promise<Order> {
  const res = await apiClient.get<ApiEnvelope<Order>>(`/orders/${orderNumber}`, {
    headers: orderTokenHeaders(orderNumber),
  });
  return res.data.data;
}

export async function cancelOrder(orderNumber: string): Promise<Order> {
  const res = await apiClient.post<ApiEnvelope<Order>>(`/orders/${orderNumber}/cancel`, null, {
    headers: orderTokenHeaders(orderNumber),
  });
  return res.data.data;
}

// --- Admin ---

export interface AdminOrderListItem {
  _id: string;
  orderNumber: string;
  user: { _id: string; firstName: string; lastName: string; email: string } | null;
  items: Order["items"];
  total: number;
  currency: string;
  paymentMethod: "cod" | "card";
  paymentStatus: Order["paymentStatus"];
  fulfillmentStatus: Order["fulfillmentStatus"];
  trackingNumber: string | null;
  createdAt: string;
}

export interface AdminOrderQuery {
  paymentStatus?: Order["paymentStatus"];
  fulfillmentStatus?: Order["fulfillmentStatus"];
  page?: number;
  limit?: number;
}

interface ApiListEnvelope<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function getAdminOrders(
  params: AdminOrderQuery = {},
): Promise<{ items: AdminOrderListItem[]; pagination: ApiListEnvelope<AdminOrderListItem>["pagination"] }> {
  const res = await apiClient.get<ApiListEnvelope<AdminOrderListItem>>("/orders/admin", { params });
  return { items: res.data.data, pagination: res.data.pagination };
}

export async function getAdminOrder(orderNumber: string): Promise<Order & { user: AdminOrderListItem["user"] }> {
  const res = await apiClient.get<ApiEnvelope<Order & { user: AdminOrderListItem["user"] }>>(
    `/orders/admin/${orderNumber}`,
  );
  return res.data.data;
}

export async function updateOrderStatus(
  orderNumber: string,
  data: { fulfillmentStatus?: "shipped" | "delivered"; paymentStatus?: "refunded"; trackingNumber?: string },
): Promise<Order> {
  const res = await apiClient.patch<ApiEnvelope<Order>>(`/orders/${orderNumber}/status`, data);
  return res.data.data;
}
