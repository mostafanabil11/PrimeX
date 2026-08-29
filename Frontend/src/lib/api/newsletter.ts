import { apiClient } from "./client";

export async function subscribeToNewsletter(email: string): Promise<void> {
  await apiClient.post("/newsletter/subscribe", { email });
}
