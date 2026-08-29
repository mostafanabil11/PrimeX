import { apiClient } from "./client";
import type { Address, AddressInput } from "@/types/address";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getAddresses(): Promise<Address[]> {
  const res = await apiClient.get<ApiEnvelope<Address[]>>("/addresses");
  return res.data.data;
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const res = await apiClient.post<ApiEnvelope<Address>>("/addresses", input);
  return res.data.data;
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const res = await apiClient.patch<ApiEnvelope<Address>>(`/addresses/${id}`, input);
  return res.data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
