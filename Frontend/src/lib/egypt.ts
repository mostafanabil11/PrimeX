// Mirrors Backend/src/common/utils/egypt.util.ts. Duplicated rather than
// shared because the two apps have no common package — if that changes, this
// is the first thing that should move into one.
export const EGYPT_GOVERNORATES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Qalyubia",
  "Port Said",
  "Suez",
  "Dakahlia",
  "Sharqia",
  "Gharbia",
  "Monufia",
  "Beheira",
  "Ismailia",
  "Faiyum",
  "Beni Suef",
  "Minya",
  "Asyut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea",
  "New Valley",
  "Matrouh",
  "North Sinai",
  "South Sinai",
  "Kafr El Sheikh",
  "Damietta",
] as const;

export type EgyptGovernorate = (typeof EGYPT_GOVERNORATES)[number];
