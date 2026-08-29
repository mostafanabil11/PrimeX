// Egypt's 27 governorates. Reference data, not a domain concept — a branch
// address and a shipping address both need it, and neither owns it.
//
// It used to live in addresses/address.schema.ts, which made the gym's Branch
// model import from the dormant storefront. The two halves share
// infrastructure, never domain modules, so it moved here.
export const EGYPT_GOVERNORATES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qalyubia',
  'Port Said',
  'Suez',
  'Dakahlia',
  'Sharqia',
  'Gharbia',
  'Monufia',
  'Beheira',
  'Ismailia',
  'Faiyum',
  'Beni Suef',
  'Minya',
  'Asyut',
  'Sohag',
  'Qena',
  'Luxor',
  'Aswan',
  'Red Sea',
  'New Valley',
  'Matrouh',
  'North Sinai',
  'South Sinai',
  'Kafr El Sheikh',
  'Damietta',
] as const;

export type EgyptGovernorate = (typeof EGYPT_GOVERNORATES)[number];
