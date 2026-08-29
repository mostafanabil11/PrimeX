import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { GENDERS } from '@/auth/schemas/user.schema';
import { OFFERED_PAYMENT_METHODS } from '@/invoices/schemas/invoice.schema';

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

// A single combined Physical Activity Readiness question rather than the
// standard seven, by deliberate choice — a "yes" routes to the same staff
// follow-up either way, and one honest catch-all is the tradeoff for asking
// it once instead of seven times. Still stored as an array against this list
// rather than a named field, so a future edit (adding a question back,
// rewording it) is still just an edit here — the index is the identity, not
// the count.
export const PARQ_QUESTIONS = [
  'Is there any health reason — a heart or blood pressure condition, chest pain, dizziness, a bone or joint problem, or anything else — you should check with a doctor before starting to exercise?',
] as const;

// Bumped whenever the membership agreement text changes. Stored on the
// subscription so we can always say which version a member accepted.
export const AGREEMENT_VERSION = '2026-08-01';

export const startJoinSchema = z.object({
  planId: OBJECT_ID,
  branchId: OBJECT_ID,

  // ISO date, no time. The member picks a day; the server decides what
  // instant that means, so a browser in another timezone cannot shift it.
  startsAt: z.iso.date('Choose a start date'),

  // --- Profile, filled in during the funnel ---
  phone: z
    .string()
    .trim()
    .min(6, 'We need a number we can reach you on')
    .max(30)
    .regex(/^[+()\-\s\d]+$/, 'Please use digits only'),
  dateOfBirth: z.iso.date().optional(),
  gender: z.enum(GENDERS).optional(),

  emergencyContactName: z.string().trim().min(1, 'Please give an emergency contact').max(120),
  emergencyContactPhone: z
    .string()
    .trim()
    .min(6, 'Please give a number for your emergency contact')
    .max(30),
  emergencyContactRelationship: z.string().trim().max(60).optional(),

  fitnessGoals: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
  medicalNotes: z.string().trim().max(2000).nullish(),

  // No longer collected in the join funnel, by request — the step asking it
  // was removed rather than shortened. Left optional rather than deleted:
  // PARQ_QUESTIONS, the /join/questionnaire endpoint and the parQ fields on
  // the user schema all still exist, so a screen can be reinstated later by
  // sending this again without a schema change. An unanswered join simply
  // never sets hasFlag.
  parqAnswers: z.array(z.boolean()).optional().default([]),

  // Must be true. A checkbox the member did not tick is not consent, and this
  // is the record we would rely on if it were ever disputed.
  acceptedAgreement: z.literal(true, {
    message: 'You need to accept the membership agreement to join',
  }),

  // 'card' only. This is the Paymob funnel, and it is the ONLY DTO in the app
  // that accepts it — the route is closed by the membershipSales feature flag,
  // so in the current configuration nothing can reach here at all.
  //
  // It used to also accept cash and instapay, which was a real hole: those two
  // settle by hand, and accepting them on the card route meant a member could
  // post a cash join to an endpoint that never asks staff to collect anything.
  // The offline methods belong on /join/reserve, which is where they are.
  paymentMethod: z.enum(['card']),

  // Lets a retried submit after a dropped connection reuse the invoice rather
  // than raise a second one.
  idempotencyKey: z.string().max(100).optional(),
});

export class StartJoinDto extends createZodDto(startJoinSchema) {}

export const previewJoinSchema = z.object({
  planId: OBJECT_ID,
});

export class PreviewJoinDto extends createZodDto(previewJoinSchema) {}

// Shared by the public reservation form and the front-desk form. Both create
// or find a member by phone number, so both need the same shape of person.
const memberFields = {
  // Two fields rather than one "name" split on a space: User.lastName is
  // required, Mongoose rejects '' for a required string, and a member with a
  // single-word name would fail deep inside the upsert with a validation
  // error nobody could act on.
  firstName: z.string().trim().min(1, 'We need a first name').max(60),
  lastName: z.string().trim().min(1, 'We need a last name').max(60),

  // Required, and the identity everything hangs off. Loose on format on
  // purpose — Egyptians write their number several ways and normalizePhone
  // reconciles them — but present, because it is how staff reach the member
  // and how the record is found again when they message on WhatsApp.
  phone: z
    .string()
    .trim()
    .min(6, 'We need a number we can reach you on')
    .max(30)
    .regex(/^[+()\-\s\d]+$/, 'Please use digits only'),

  // Optional, deliberately. Plenty of members have no email or will not give
  // one, and demanding it costs more reservations than the receipt is worth.
  email: z.email('That does not look like an email address').max(200).nullish(),
};

/**
 * A reservation made on the website, paid offline.
 *
 * Much smaller than startJoinSchema because it asks only what staff need to
 * finish the conversation on WhatsApp. No emergency contact, no date of birth,
 * no PAR-Q — all of that is collected at the desk on the first visit, where
 * someone can explain why it is being asked.
 *
 * There is no price field, and there is not going to be one: the plan id is
 * the only thing the browser sends about money, and the server prices it.
 */
export const reserveJoinSchema = z.object({
  planId: OBJECT_ID,

  // Resolved server-side when absent. The gym runs from one site, so making a
  // member choose a branch is a question with one answer.
  branchId: OBJECT_ID.optional(),

  startsAt: z.iso.date('Choose a start date'),

  ...memberFields,

  // Cash, InstaPay and wallet are tracked apart because the money lands in
  // three different places — a drawer, a bank account, a mobile wallet — and
  // reconciling a month is impossible if every reservation claims to be cash.
  // See the note on Invoice.paymentMethod.
  paymentMethod: z.enum(OFFERED_PAYMENT_METHODS),

  acceptedAgreement: z.literal(true, {
    message: 'You need to accept the membership agreement to reserve',
  }),

  // Honeypot. A real browser never fills this — it is hidden — so anything
  // arriving with it set is automated. Named for what a bot expects to see.
  website: z.string().max(200).optional(),

  idempotencyKey: z.string().max(100).optional(),
});

export class ReserveJoinDto extends createZodDto(reserveJoinSchema) {}

/**
 * A membership recorded by staff for someone who never used the website.
 *
 * Differs from a reservation in exactly two ways: the start date may be in the
 * past (importing a member who has been training for weeks), and staff can
 * mark it paid in the same action, because usually the cash is already in
 * their hand.
 */
export const recordMembershipSchema = z.object({
  planId: OBJECT_ID,
  branchId: OBJECT_ID.optional(),

  // May be in the past — see allowBackdating in SubscriptionsService.
  startsAt: z.iso.date('Choose a start date'),

  ...memberFields,

  paymentMethod: z.enum(OFFERED_PAYMENT_METHODS),

  // No .default() anywhere in this file's DTOs, and especially not here: a
  // missing key must not silently decide that money changed hands.
  markPaid: z.boolean(),

  note: z.string().trim().max(500).nullish(),
});

export class RecordMembershipDto extends createZodDto(recordMembershipSchema) {}
