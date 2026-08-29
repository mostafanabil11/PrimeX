export const EGYPT_GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Qalyubia", "Port Said", "Suez", "Dakahlia",
  "Sharqia", "Gharbia", "Monufia", "Beheira", "Ismailia", "Faiyum", "Beni Suef",
  "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Red Sea", "New Valley",
  "Matrouh", "North Sinai", "South Sinai", "Kafr El Sheikh", "Damietta",
] as const;
export type EgyptGovernorate = (typeof EGYPT_GOVERNORATES)[number];

export interface Address {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  governorate: EgyptGovernorate;
  postalCode: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  governorate: EgyptGovernorate;
  postalCode?: string | null;
  isDefault?: boolean;
}
