// Shapes returned by the gym half of the API. Mirrors the Mongoose schemas in
// Backend/src/{branches,plans,trainers,class-types,content}.
//
// Money is always minor units (piastres) — pass it through formatPrice, never
// render it raw. Times are wall-clock "HH:mm" strings, not instants, because
// they repeat weekly and an instant would drift with daylight saving.

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface OpeningHours {
  day: Weekday;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
}

export interface WomenOnlyWindow {
  day: Weekday;
  startsAt: string;
  endsAt: string;
}

export interface Branch {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  addressLine: string;
  city: string;
  governorate: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  facilities: string[];
  images: string[];
  openingHours: OpeningHours[];
  womenOnlyWindows: WomenOnlyWindow[];
  sortOrder: number;
  isActive: boolean;
}

export type DurationUnit = "day" | "week" | "month" | "year";
export type ClassAccessMode = "none" | "credits" | "unlimited";
export type BranchAccessMode = "single" | "all";

export interface ClassAccess {
  mode: ClassAccessMode;
  creditsPerCycle: number;
}

// gym_or_fitness   — the weights floor OR the studio timetable, member picks
// gym_plus_fitness — both, which is what the upper tiers are for
export type AccessScope = "gym_or_fitness" | "gym_plus_fitness";

// A countable benefit on the pricing card — "10 Jacuzzi", "3 InBody".
export interface PlanPerk {
  label: string;
  value: number;
}

/**
 * What a plan sells at today, resolved on the server.
 *
 * Never recomputed in the browser. The join funnel charges what the backend
 * says, and a second implementation here would eventually disagree with the
 * invoice — so this is read and displayed, never derived from.
 */
export interface PlanPricing {
  listPriceMinorUnits: number;
  effectivePriceMinorUnits: number;
  savingMinorUnits: number;
  savingPercent: number;
  appliedOffer: { id: string | null; name: string } | null;
}

export interface Plan {
  _id: string;
  name: string;
  slug: string;
  tier: string | null;
  description: string | null;
  benefits: string[];
  durationValue: number;
  durationUnit: DurationUnit;
  priceMinorUnits: number;
  discountPriceMinorUnits: number | null;
  // null means "use the gym-wide fee from settings"; 0 means this plan waives
  // it. Two different statements, so never collapse them into a falsy check.
  joiningFeeMinorUnits: number | null;
  classAccess: ClassAccess;
  branchAccess: BranchAccessMode;
  accessScope: AccessScope;
  // null on either means unlimited — the top tier sells "come every day",
  // which is an absence of a cap rather than a very large one.
  sessionsIncluded: number | null;
  daysPerWeek: number | null;
  freezeDaysAllowed: number;
  guestPasses: number;
  perks: PlanPerk[];
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  // Present on the public routes, absent on the admin ones — the admin form
  // edits list prices, the public pages render what people actually pay.
  pricing?: PlanPricing;
}

export interface AvailabilityWindow {
  day: Weekday;
  startsAt: string;
  endsAt: string;
}

// Populated on the public list and detail routes, a bare id string on the
// admin routes — the admin form edits ids, the public pages render names.
export type BranchRef = string | Pick<Branch, "_id" | "name" | "slug" | "city">;

export interface Trainer {
  _id: string;
  name: string;
  slug: string;
  photo: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  languages: string[];
  yearsOfExperience: number;
  branches: BranchRef[];
  availability: AvailabilityWindow[];
  hourlyRateMinorUnits: number | null;
  instagramUrl: string | null;
  averageRating: number;
  reviewCount: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ClassType {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  intensity: number;
  durationMinutes: number;
  equipment: string[];
  defaultCapacity: number;
  colorToken: string | null;
  averageRating: number;
  reviewCount: number;
  sortOrder: number;
  isActive: boolean;
}

export interface Testimonial {
  _id: string;
  name: string;
  quote: string;
  photo: string | null;
  attribution: string | null;
  rating: number | null;
  branch: string | null;
  sortOrder: number;
  isActive: boolean;
}

// --- Content ---

export type ContentType = "text" | "longText" | "list";

// Public shape: every known key already resolved to a value, defaults applied.
export type SiteContent = Record<string, string | string[]>;

// Admin shape: the same values plus the registry metadata the editor renders
// from, so the form is driven by the backend rather than duplicated here.
export interface ContentField {
  key: string;
  group: "site" | "home" | "about" | "contact";
  label: string;
  type: ContentType;
  hint?: string;
  maxLength: number;
  default: string | string[];
  current: string | string[];
  currentAr: string | string[];
  isOverridden: boolean;
}

// Helpers for reading resolved content without casting at every call site.
export function contentText(content: SiteContent, key: string, fallback = ""): string {
  const value = content[key];
  return typeof value === "string" ? value : fallback;
}

export function contentList(content: SiteContent, key: string): string[] {
  const value = content[key];
  return Array.isArray(value) ? value : [];
}
