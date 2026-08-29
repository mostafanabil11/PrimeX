import { serverFetch, serverFetchOptional, ServerFetchError } from "./server-fetch";
import type { Branch, Plan, Trainer, ClassType, Testimonial, SiteContent } from "@/types/gym";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// Five minutes. This data changes when an admin edits it, which is rarely, and
// the cost of a page being five minutes stale is nil — whereas hitting the API
// on every render of the homepage is not.
const REVALIDATE = 300;

// Lists and copy are things a page can survive without: a homepage with no
// testimonials is a smaller homepage, not a broken one. So these fall back to
// empty rather than throwing, and the section renders nothing.
//
// Detail lookups do the opposite — see the getXBySlug functions below.

export function getBranchesServer(): Promise<Branch[]> {
  return serverFetchOptional<ApiEnvelope<Branch[]>>(
    "/branches",
    { revalidate: REVALIDATE },
    { success: true, message: "", data: [] },
  ).then((r) => r.data);
}

export function getPlansServer(): Promise<Plan[]> {
  return serverFetchOptional<ApiEnvelope<Plan[]>>(
    "/plans",
    { revalidate: REVALIDATE },
    { success: true, message: "", data: [] },
  ).then((r) => r.data);
}

export function getTrainersServer(branchId?: string): Promise<Trainer[]> {
  const path = branchId ? `/trainers?branch=${encodeURIComponent(branchId)}` : "/trainers";
  return serverFetchOptional<ApiEnvelope<Trainer[]>>(
    path,
    { revalidate: REVALIDATE },
    { success: true, message: "", data: [] },
  ).then((r) => r.data);
}

export function getClassTypesServer(): Promise<ClassType[]> {
  return serverFetchOptional<ApiEnvelope<ClassType[]>>(
    "/class-types",
    { revalidate: REVALIDATE },
    { success: true, message: "", data: [] },
  ).then((r) => r.data);
}

export function getTestimonialsServer(): Promise<Testimonial[]> {
  return serverFetchOptional<ApiEnvelope<Testimonial[]>>(
    "/content/testimonials",
    { revalidate: REVALIDATE },
    { success: true, message: "", data: [] },
  ).then((r) => r.data);
}

// Falls back to an empty object rather than throwing, and every read goes
// through contentText/contentList which supply their own fallback. So an API
// outage costs the wording, not the page.
export function getContentServer(): Promise<SiteContent> {
  return serverFetchOptional<ApiEnvelope<SiteContent>>(
    "/content",
    { revalidate: REVALIDATE },
    { success: true, message: "", data: {} },
  ).then((r) => r.data);
}

// Detail lookups return null on a 404 so the page can call notFound(), and
// throw on anything else. Swallowing a real failure here would render "branch
// not found" for a branch that exists, which is worse than an error page.
async function getOneBySlug<T>(path: string): Promise<T | null> {
  try {
    const res = await serverFetch(path, { revalidate: REVALIDATE });
    if (res.status === 404) return null;
    if (!res.ok) throw new ServerFetchError(`API responded ${res.status}: ${path}`, res.status);
    const body = (await res.json()) as ApiEnvelope<T>;
    return body.data;
  } catch (err) {
    if (err instanceof ServerFetchError && err.status === 404) return null;
    throw err;
  }
}

export function getBranchBySlugServer(slug: string): Promise<Branch | null> {
  return getOneBySlug<Branch>(`/branches/${encodeURIComponent(slug)}`);
}

export function getPlanBySlugServer(slug: string): Promise<Plan | null> {
  return getOneBySlug<Plan>(`/plans/${encodeURIComponent(slug)}`);
}

export function getTrainerBySlugServer(slug: string): Promise<Trainer | null> {
  return getOneBySlug<Trainer>(`/trainers/${encodeURIComponent(slug)}`);
}

export function getClassTypeBySlugServer(slug: string): Promise<ClassType | null> {
  return getOneBySlug<ClassType>(`/class-types/${encodeURIComponent(slug)}`);
}
