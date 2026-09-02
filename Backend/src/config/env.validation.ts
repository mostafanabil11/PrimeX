import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  // Not z.url(): a replica-set connection string lists several hosts
  // separated by commas, which is valid Mongo syntax but not a parseable URL,
  // and rejecting it would refuse to boot against a perfectly good cluster.
  // The scheme is the part actually worth checking.
  MONGODB_URI: z
    .string()
    .refine(
      value => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'MONGODB_URI must start with mongodb:// or mongodb+srv://'
    ),

  // One or more site origins, comma-separated — a deployed site has several
  // (production, custom domain, per-branch previews) and all of them need to
  // pass CORS. Validated per entry so one malformed origin is caught here at
  // boot rather than as a confusing CORS failure in the browser later.
  FRONTEND_URL: z
    .string()
    .default('http://localhost:3001')
    .refine(
      value =>
        value
          .split(',')
          .map(url => url.trim())
          .filter(Boolean)
          .every(url => URL.canParse(url)),
      'FRONTEND_URL must be a URL, or several comma-separated URLs'
    ),

  JWT_SECRET: z
    .string()
    .min(
      32,
      'JWT_SECRET must be at least 32 characters — generate one with `openssl rand -base64 48`'
    ),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // The customer-facing brand. Read in one place (ConfigService.brandName)
  // and threaded from there, so renaming the gym is an env change rather
  // than a find-and-replace across email templates and page metadata.
  BRAND_NAME: z.string().optional(),

  // Email transport — Brevo's HTTP API is preferred where SMTP ports are
  // blocked (most managed hosts); Gmail over SMTP stays for local development.
  // All optional: the app runs without email, it just delivers nothing.
  BREVO_API_KEY: z.string().optional(),
  MAIL_FROM_ADDRESS: z.email().optional(),
  MAIL_FROM_NAME: z.string().optional(),

  EMAIL_USER: z.email().optional(),
  EMAIL_PASSWORD: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  OTP_EXPIRATION_MINUTES: z.string().default('10').transform(Number),
  MAX_LOGIN_ATTEMPTS: z.string().default('5').transform(Number),
  LOCK_TIME_MINUTES: z.string().default('15').transform(Number),

  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_INTEGRATION_ID: z.string().optional(),
  PAYMOB_IFRAME_ID: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().optional(),

  // Feature flags. Each names a whole capability, and each mirrors a const in
  // Frontend/src/lib/features.ts — the pair has to agree or the UI offers a
  // route the API refuses. Switching one off makes its controllers 404 and its
  // cron jobs no-ops; the modules stay registered and their tests keep running.
  //
  // Default false, deliberately. A deployment that forgets a variable lands in
  // brochure mode, which sends no email and writes no data — the safe direction
  // to fail in. Turning a capability on is the decision that should be explicit.
  //
  // MEMBER_ACCOUNTS_ENABLED gates registration and the member-facing account
  // pages. It must never gate login: that is how staff reach /admin.
  //
  // MEMBERSHIP_SALES_ENABLED means online CARD CHECKOUT specifically — the
  // Paymob funnel. MEMBERSHIP_TRACKING_ENABLED means membership records exist
  // and staff can work them: reservations, the admin invoice table, taking
  // cash at the desk. They are separate because the gym currently does the
  // second without the first, and one flag covering both is what took the
  // admin membership screens offline.
  MEMBERSHIP_SALES_ENABLED: z
    .string()
    .default('false')
    .transform(value => value === 'true'),
  MEMBERSHIP_TRACKING_ENABLED: z
    .string()
    .default('false')
    .transform(value => value === 'true'),
  CLASS_BOOKING_ENABLED: z
    .string()
    .default('false')
    .transform(value => value === 'true'),
  MEMBER_ACCOUNTS_ENABLED: z
    .string()
    .default('false')
    .transform(value => value === 'true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
}
