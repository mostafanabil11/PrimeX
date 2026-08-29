import { apiClient } from "./client";
import { serverFetch, serverFetchOptional } from "./server-fetch";
import type { Category } from "@/types/category";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getCategoryTree(): Promise<Category[]> {
  const res = await apiClient.get<ApiEnvelope<Category[]>>("/categories");
  return res.data.data;
}

export async function getFeaturedCategories(): Promise<Category[]> {
  const res = await apiClient.get<ApiEnvelope<Category[]>>("/categories/featured");
  return res.data.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const res = await apiClient.get<ApiEnvelope<Category>>(`/categories/${slug}`);
  return res.data.data;
}

// --- Admin ---

export interface CategoryInput {
  name: string;
  parent?: string | null;
  image?: string | null;
  description?: string | null;
  displayOrder?: number;
  isFeaturedOnHome?: boolean;
  isActive?: boolean;
}

export async function getAdminCategoryTree(): Promise<Category[]> {
  const res = await apiClient.get<ApiEnvelope<Category[]>>("/categories/admin/tree");
  return res.data.data;
}

export async function createCategory(data: CategoryInput): Promise<Category> {
  const res = await apiClient.post<ApiEnvelope<Category>>("/categories", data);
  return res.data.data;
}

export async function updateCategory(id: string, data: Partial<CategoryInput>): Promise<Category> {
  const res = await apiClient.patch<ApiEnvelope<Category>>(`/categories/${id}`, data);
  return res.data.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function reorderCategories(items: { id: string; displayOrder: number }[]): Promise<void> {
  await apiClient.patch("/categories/reorder", { items });
}

export async function getChildCategoryBySlug(
  parentSlug: string,
  childSlug: string,
): Promise<Category> {
  const res = await apiClient.get<ApiEnvelope<Category>>(`/categories/${parentSlug}/${childSlug}`);
  return res.data.data;
}

// --- Server-side (Server Components only) — see products.ts for why native
// fetch is used here instead of the axios client above.

// Not optional: a category page is about this category, so a failure should
// surface rather than render an empty page as though it were legitimately bare.
export async function getCategoryBySlugServer(slug: string): Promise<Category | null> {
  const res = await serverFetch(`/categories/${slug}`, { revalidate: 300 });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch category "${slug}": ${res.status}`);
  const body: ApiEnvelope<Category> = await res.json();
  return body.data;
}

// Optional: an empty list means category pages render on demand rather than
// being prerendered, which beats failing the build.
export async function getTopLevelCategorySlugsServer(): Promise<string[]> {
  const body = await serverFetchOptional<ApiEnvelope<Category[]> | null>(
    '/categories',
    { revalidate: 3600 },
    null,
  );
  return body?.data.map((c) => c.slug) ?? [];
}

// Optional: this feeds the nav menu, which renders on the layout and therefore
// on every page. A missing menu is a degraded page; a thrown error is no page.
//
// Revalidated every five minutes rather than hourly, despite categories almost
// never changing. The interval is not about freshness — it is the blast radius
// of a failed fetch. Falling back to an empty list means an empty nav gets
// rendered and then *cached*, so an hour-long window turned one unlucky moment
// into an hour of a site with no navigation. Five minutes bounds that, and
// re-fetching a tiny payload that often costs nothing.
export async function getCategoryTreeServer(): Promise<Category[]> {
  const body = await serverFetchOptional<ApiEnvelope<Category[]> | null>(
    '/categories',
    { revalidate: 300 },
    null,
  );
  return body?.data ?? [];
}

export async function getChildCategoryBySlugServer(parentSlug: string, childSlug: string): Promise<Category | null> {
  const res = await serverFetch(`/categories/${parentSlug}/${childSlug}`, { revalidate: 300 });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch child category "${childSlug}": ${res.status}`);
  const body: ApiEnvelope<Category> = await res.json();
  return body.data;
}
