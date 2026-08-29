import { apiClient } from "./client";
import type { User } from "@/types/user";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ email: string; message: string }> {
  const res = await apiClient.post<ApiEnvelope<{ email: string; message: string }>>(
    "/auth/register",
    data,
  );
  return res.data.data;
}

export async function verifyEmail(data: { email: string; otp: string }): Promise<void> {
  await apiClient.post("/auth/verify-email", data);
}

export async function resendOtp(email: string): Promise<void> {
  await apiClient.post("/auth/resend-otp", { email });
}

export async function loginUser(data: { email: string; password: string }): Promise<User> {
  const res = await apiClient.post<ApiEnvelope<{ user: User }>>("/auth/login", data);
  return res.data.data.user;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getProfile(): Promise<User> {
  const res = await apiClient.get<ApiEnvelope<User>>("/auth/profile");
  return res.data.data;
}

// The full member profile, including health information. Fetched only by the
// settings screen — the session check on every page load uses getProfile
// above, which deliberately carries none of this.
export interface MemberProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "prefer_not_to_say" | null;
  emergencyContact: { name: string | null; phone: string | null; relationship: string | null } | null;
  fitnessGoals: string[];
  medicalNotes: string | null;
  emailClassReminders: boolean;
  emailMarketing: boolean;
  referralCode: string | null;
  parQFlagged: boolean;
}

export async function getMemberProfile(): Promise<MemberProfile> {
  const res = await apiClient.get<ApiEnvelope<MemberProfile>>("/auth/me");
  return res.data.data;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "prefer_not_to_say" | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  fitnessGoals?: string[];
  medicalNotes?: string | null;
  emailClassReminders?: boolean;
  emailMarketing?: boolean;
}

export async function updateProfile(data: UpdateProfileInput): Promise<User> {
  const res = await apiClient.patch<ApiEnvelope<User>>("/auth/profile", data);
  return res.data.data;
}

export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiClient.post("/auth/change-password", data);
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, newPassword });
}
