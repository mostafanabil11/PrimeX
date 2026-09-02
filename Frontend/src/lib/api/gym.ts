import { apiClient } from "./client";
import type {
  Branch,
  Plan,
  Trainer,
  ClassType,
  Testimonial,
  SiteContent,
  ContentField,
} from "@/types/gym";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

// Every list endpoint comes in two flavours: the public one returns active
// records only, the admin one includes hidden ones so they can be brought back.

// --- Branches ---

export async function getBranches(): Promise<Branch[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Branch[]>>("/branches"));
}

export async function getBranchesAdmin(): Promise<Branch[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Branch[]>>("/branches/admin"));
}

export async function getBranchAdmin(id: string): Promise<Branch> {
  return unwrap(await apiClient.get<ApiEnvelope<Branch>>(`/branches/admin/${id}`));
}

export async function createBranch(input: Partial<Branch>): Promise<Branch> {
  return unwrap(await apiClient.post<ApiEnvelope<Branch>>("/branches", input));
}

export async function updateBranch(id: string, input: Partial<Branch>): Promise<Branch> {
  return unwrap(await apiClient.patch<ApiEnvelope<Branch>>(`/branches/${id}`, input));
}

export async function deactivateBranch(id: string): Promise<Branch> {
  return unwrap(await apiClient.delete<ApiEnvelope<Branch>>(`/branches/${id}`));
}

// --- Plans ---

export async function getPlans(): Promise<Plan[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Plan[]>>("/plans"));
}

export async function getPlansAdmin(): Promise<Plan[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Plan[]>>("/plans/admin"));
}

export async function getPlanAdmin(id: string): Promise<Plan> {
  return unwrap(await apiClient.get<ApiEnvelope<Plan>>(`/plans/admin/${id}`));
}

export async function createPlan(input: Partial<Plan>): Promise<Plan> {
  return unwrap(await apiClient.post<ApiEnvelope<Plan>>("/plans", input));
}

export async function updatePlan(id: string, input: Partial<Plan>): Promise<Plan> {
  return unwrap(await apiClient.patch<ApiEnvelope<Plan>>(`/plans/${id}`, input));
}

export async function deactivatePlan(id: string): Promise<Plan> {
  return unwrap(await apiClient.delete<ApiEnvelope<Plan>>(`/plans/${id}`));
}

// --- Trainers ---

export async function getTrainers(branchId?: string): Promise<Trainer[]> {
  return unwrap(
    await apiClient.get<ApiEnvelope<Trainer[]>>("/trainers", {
      params: branchId ? { branch: branchId } : undefined,
    }),
  );
}

export async function getTrainersAdmin(): Promise<Trainer[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Trainer[]>>("/trainers/admin"));
}

export async function getTrainerAdmin(id: string): Promise<Trainer> {
  return unwrap(await apiClient.get<ApiEnvelope<Trainer>>(`/trainers/admin/${id}`));
}

export async function createTrainer(input: Record<string, unknown>): Promise<Trainer> {
  return unwrap(await apiClient.post<ApiEnvelope<Trainer>>("/trainers", input));
}

export async function updateTrainer(id: string, input: Record<string, unknown>): Promise<Trainer> {
  return unwrap(await apiClient.patch<ApiEnvelope<Trainer>>(`/trainers/${id}`, input));
}

export async function deactivateTrainer(id: string): Promise<Trainer> {
  return unwrap(await apiClient.delete<ApiEnvelope<Trainer>>(`/trainers/${id}`));
}

// --- Class types ---

export async function getClassTypes(): Promise<ClassType[]> {
  return unwrap(await apiClient.get<ApiEnvelope<ClassType[]>>("/class-types"));
}

export async function getClassTypesAdmin(): Promise<ClassType[]> {
  return unwrap(await apiClient.get<ApiEnvelope<ClassType[]>>("/class-types/admin"));
}

export async function getClassTypeAdmin(id: string): Promise<ClassType> {
  return unwrap(await apiClient.get<ApiEnvelope<ClassType>>(`/class-types/admin/${id}`));
}

export async function createClassType(input: Partial<ClassType>): Promise<ClassType> {
  return unwrap(await apiClient.post<ApiEnvelope<ClassType>>("/class-types", input));
}

export async function updateClassType(id: string, input: Partial<ClassType>): Promise<ClassType> {
  return unwrap(await apiClient.patch<ApiEnvelope<ClassType>>(`/class-types/${id}`, input));
}

export async function deactivateClassType(id: string): Promise<ClassType> {
  return unwrap(await apiClient.delete<ApiEnvelope<ClassType>>(`/class-types/${id}`));
}

// --- Content ---

export async function getSiteContent(): Promise<SiteContent> {
  return unwrap(await apiClient.get<ApiEnvelope<SiteContent>>("/content"));
}

export async function getContentAdmin(): Promise<ContentField[]> {
  return unwrap(await apiClient.get<ApiEnvelope<ContentField[]>>("/content/admin"));
}

export interface ContentBlockInput {
  key: string;
  value?: string;
  values?: string[];
  valueAr?: string;
  valuesAr?: string[];
}

export async function updateContent(blocks: ContentBlockInput[]): Promise<ContentField[]> {
  return unwrap(await apiClient.put<ApiEnvelope<ContentField[]>>("/content", { blocks }));
}

export async function resetContentBlock(key: string): Promise<void> {
  await apiClient.delete(`/content/block/${encodeURIComponent(key)}`);
}

// --- Testimonials ---

export async function getTestimonials(): Promise<Testimonial[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Testimonial[]>>("/content/testimonials"));
}

export async function getTestimonialsAdmin(): Promise<Testimonial[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Testimonial[]>>("/content/admin/testimonials"));
}

export async function createTestimonial(input: Partial<Testimonial>): Promise<Testimonial> {
  return unwrap(await apiClient.post<ApiEnvelope<Testimonial>>("/content/testimonials", input));
}

export async function updateTestimonial(
  id: string,
  input: Partial<Testimonial>,
): Promise<Testimonial> {
  return unwrap(
    await apiClient.patch<ApiEnvelope<Testimonial>>(`/content/testimonials/${id}`, input),
  );
}

export async function deleteTestimonial(id: string): Promise<void> {
  await apiClient.delete(`/content/testimonials/${id}`);
}

// --- Enquiries ---

export interface EnquiryInput {
  type: "contact" | "trial";
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  goal?: string | null;
  preferredTime?: string | null;
  branch?: string | null;
  trainerSlug?: string | null;
  source?: string | null;
  website?: string;
}

export interface EnquiryResult {
  message: string;
  duplicate: boolean;
}

// The form knows a trainer by slug, the API stores an id. Resolving it here
// keeps the form from having to fetch the trainer just to name them, and a
// slug that does not resolve is dropped rather than failing the submission —
// losing the attribution is much cheaper than losing the lead.
export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  const { trainerSlug, ...rest } = input;

  let trainer: string | null = null;
  if (trainerSlug) {
    try {
      const found = await apiClient.get<ApiEnvelope<Trainer>>(
        `/trainers/${encodeURIComponent(trainerSlug)}`,
      );
      trainer = found.data.data._id;
    } catch {
      trainer = null;
    }
  }

  const res = await apiClient.post<ApiEnvelope<{ duplicate: boolean }>>("/enquiries", {
    ...rest,
    trainer,
  });

  return { message: res.data.message, duplicate: res.data.data.duplicate };
}

export type EnquiryType = "contact" | "trial";
export type EnquiryStatus = "new" | "contacted" | "booked" | "converted" | "lost";

export interface EnquiryNote {
  _id: string;
  body: string;
  createdAt: string;
}

// branch and trainer come back populated on the admin routes, so they are
// objects here rather than the id strings the schema stores.
export interface Enquiry {
  _id: string;
  type: EnquiryType;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  goal: string | null;
  preferredTime: string | null;
  branch: { _id: string; name: string; slug: string } | null;
  trainer: { _id: string; name: string; slug: string } | null;
  source: string | null;
  status: EnquiryStatus;
  notes: EnquiryNote[];
  createdAt: string;
}

export interface EnquiryList {
  enquiries: Enquiry[];
  total: number;
  openCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getEnquiries(params?: {
  type?: EnquiryType;
  status?: EnquiryStatus;
  branch?: string;
  page?: number;
}): Promise<EnquiryList> {
  return unwrap(await apiClient.get<ApiEnvelope<EnquiryList>>("/enquiries", { params }));
}

export async function updateEnquiry(
  id: string,
  input: { status?: EnquiryStatus; assignedTo?: string | null; branch?: string | null },
): Promise<Enquiry> {
  return unwrap(await apiClient.patch<ApiEnvelope<Enquiry>>(`/enquiries/${id}`, input));
}

export async function addEnquiryNote(id: string, body: string): Promise<Enquiry> {
  return unwrap(await apiClient.post<ApiEnvelope<Enquiry>>(`/enquiries/${id}/notes`, { body }));
}
