import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';

// Keep these names in sync with the getters on ConfigService
// (membershipSalesEnabled, membershipTrackingEnabled, classBookingEnabled,
// memberAccountsEnabled, shopEnabled) and with the consts in
// Frontend/src/lib/features.ts.
//
// membershipSales and membershipTracking are deliberately separate, and the
// distinction is the whole shape of the current site: the gym does not sell
// online (no card checkout — membershipSales off), but it very much does keep
// membership records and take money at the desk (membershipTracking on).
// Collapsing them into one flag is what made /admin/memberships 404.
export type FeatureName =
  'membershipSales' | 'membershipTracking' | 'classBooking' | 'memberAccounts' | 'shop';

// Marks a controller or handler as belonging to a capability that can be
// switched off. FeatureGuard 404s the route when any named feature is off —
// see its comment for why that's the right status code here.
export const Feature = (...features: FeatureName[]) => SetMetadata(FEATURE_KEY, features);
