import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

// One entry per signed-in device/browser, so logging in on a phone doesn't
// silently invalidate a desktop session — each holds its own hashed refresh
// token that rotates independently on every /auth/refresh call.
@Schema({ _id: true, timestamps: false })
export class Session {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  tokenHash: string = '';

  @Prop({ type: String, default: null })
  userAgent: string | null = null;

  @Prop({ type: String, default: null })
  ip: string | null = null;

  @Prop({ required: true })
  createdAt: Date = new Date();

  @Prop({ required: true })
  expiresAt: Date = new Date();
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// member  — a customer, whether or not they currently hold a subscription
// trainer — teaches classes and personal training; sees their own schedule
// staff   — front desk: check-ins, cash payments, rosters, member lookup
// admin   — everything, including money, plans and settings
//
// 'user' was the previous default and is migrated to 'member' by
// scripts/migrate-roles.js. Nothing writes it any more.
export const USER_ROLES = ['member', 'trainer', 'staff', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GENDERS = ['male', 'female', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

// Physical Activity Readiness Questionnaire. Seven yes/no questions that are
// the standard pre-exercise screen; a yes on any of them flags the account for
// staff sign-off rather than blocking the join, because the judgement is a
// human one. Stored with the answered-at date so consent can be shown to be
// current.
@Schema({ _id: false })
export class ParQ {
  @Prop({ type: [Boolean], default: [] })
  answers: boolean[] = [];

  @Prop({ default: false })
  hasFlag: boolean = false;

  @Prop({ type: Date, default: null })
  completedAt: Date | null = null;

  @Prop({ type: Date, default: null })
  clearedByStaffAt: Date | null = null;
}

export const ParQSchema = SchemaFactory.createForClass(ParQ);

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ type: String, default: null })
  name: string | null = null;

  @Prop({ type: String, default: null })
  phone: string | null = null;

  @Prop({ type: String, default: null })
  relationship: string | null = null;
}

export const EmergencyContactSchema = SchemaFactory.createForClass(EmergencyContact);

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  // Nullable since members can be created at the front desk or by a website
  // reservation, where a phone number is all anyone gives — see the partial
  // index below, and phoneNormalized, which is the identifier those members
  // are actually found by. Every self-registered account still has one, and
  // the DTOs that reach register/login/reset all require a real string.
  @Prop({ type: String, default: null })
  email: string | null = null;

  // Still required even for accounts nobody will ever sign into: those get an
  // unguessable random hash, the same idiom googleLogin() uses. A nullable
  // password would mean every comparison site had to decide what "no password"
  // means, and one of them would eventually decide "matches".
  @Prop({ required: true })
  password: string = '';

  @Prop({ required: true })
  firstName: string = '';

  @Prop({ required: true })
  lastName: string = '';

  @Prop({ default: false })
  isEmailVerified: boolean = false;

  @Prop({ type: String, default: null })
  emailVerificationOtp: string | null = null;

  @Prop({ type: Date, default: null })
  otpExpiresAt: Date | null = null;

  @Prop({ default: 0 })
  loginAttempts: number = 0;

  @Prop({ type: Date, default: null })
  lastLoginAttempt: Date | null = null;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null = null;

  @Prop({ default: true })
  isActive: boolean = true;

  @Prop({ default: 'member', enum: USER_ROLES })
  role: UserRole = 'member';

  @Prop({ type: String, default: null })
  googleId: string | null = null;

  @Prop({ default: 'local' })
  authProvider: 'local' | 'google' = 'local';

  @Prop({ type: [SessionSchema], default: [] })
  sessions: Session[] = [];

  @Prop({ type: String, default: null })
  resetPasswordToken: string | null = null;

  @Prop({ type: Date, default: null })
  resetPasswordExpiresAt: Date | null = null;

  // --- Member profile ---
  //
  // All optional: an account exists from the moment someone registers, which
  // is before they have told us any of this. The join funnel fills it in.

  // As the member typed it. Egyptians give their number as 010…, +20 10… or
  // 0020 10… interchangeably, and the raw string is what staff recognise when
  // they read it back, so it is stored unaltered and never indexed.
  @Prop({ type: String, default: null })
  phone: string | null = null;

  // Digits with the country code, from normalizePhone(). This is the real
  // identity for a member who has no email: the reservation form and the
  // front-desk form both find-or-create on it, which is what stops one person
  // typing their number three ways and becoming three separate members.
  @Prop({ type: String, default: null })
  phoneNormalized: string | null = null;

  @Prop({ type: Date, default: null })
  dateOfBirth: Date | null = null;

  @Prop({ type: String, default: null, enum: [...GENDERS, null] })
  gender: Gender | null = null;

  @Prop({ type: String, default: null })
  photo: string | null = null;

  @Prop({ type: EmergencyContactSchema, default: () => ({}) })
  emergencyContact: EmergencyContact = new EmergencyContact();

  @Prop({ type: [String], default: [] })
  fitnessGoals: string[] = [];

  // Free text the member volunteers — injuries, conditions, medication.
  // Sensitive personal data: never returned to anyone but the member and
  // staff, and covered explicitly by the privacy policy.
  @Prop({ type: String, default: null })
  medicalNotes: string | null = null;

  @Prop({ type: ParQSchema, default: () => ({}) })
  parQ: ParQ = new ParQ();

  // Their own code to hand out. Generated on first activation, then stable —
  // a referral code that changed would invalidate every share of it.
  @Prop({ type: String, default: null })
  referralCode: string | null = null;

  /**
   * The number a member reads out at the front desk. Short and sequential
   * (1001, 1002, ...) because it is spoken aloud and typed by hand — the
   * ObjectId is unusable for that.
   *
   * Assigned from the shared Counter, but deliberately settable rather than
   * strictly generated: a gym adopting this system already has members
   * carrying numbers, and those have to be imported as-is. Renumbering a
   * real membership base would invalidate every card already in a wallet.
   * See scripts/backfill-member-numbers.js, which also lifts the counter
   * clear of the highest imported number so new members cannot collide.
   *
   * Nullable, and the index below is partial rather than plain-unique, so
   * the many existing rows without one do not all collide on null.
   */
  @Prop({ type: Number, default: null })
  memberNumber: number | null = null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', default: null })
  homeBranch: Types.ObjectId | null = null;

  // Opt-outs, not opt-ins: transactional mail (receipts, expiry warnings)
  // always sends. These cover the rest.
  @Prop({ default: true })
  emailClassReminders: boolean = true;

  @Prop({ default: true })
  emailMarketing: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// resetPasswordToken stores a sha256 hash (not bcrypt — it's already 32 random
// bytes, so it needs no further slow-hashing) so resetPassword() can look the
// user up directly by token instead of bcrypt-comparing against every pending user.
//
// A partial index, not `sparse: true`: Mongoose's `default: null` above means
// every document has this field *present* (set to null), never actually
// absent — and MongoDB's sparse indexes only exempt documents where the
// field is missing entirely, not ones where it's explicitly null. `sparse`
// here would happily index every user's `null`, which is harmless for a
// non-unique index but was the exact mechanism that broke the (unique)
// googleId index below.
UserSchema.index(
  { resetPasswordToken: 1 },
  { partialFilterExpression: { resetPasswordToken: { $type: 'string' } } }
);

// local-auth users never get a googleId, so a plain unique index would
// collide once a second such user exists — both have the field present as
// explicit `null` (Mongoose's default, not "missing"), which `sparse`
// does NOT exempt. A partial index keyed on "is actually a string" is the
// correct way to make a nullable field's real values unique.
UserSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } }
);

// Same reasoning as googleId above, and the same trap: memberNumber defaults
// to null, so it is present-but-null on every user who has not been assigned
// one yet. Keyed on "is actually a number" so those nulls are exempt while
// real member numbers stay unique — two members sharing 1042 would make the
// front-desk lookup ambiguous, which is the one thing this number exists to
// avoid.
UserSchema.index(
  { memberNumber: 1 },
  { unique: true, partialFilterExpression: { memberNumber: { $type: 'number' } } }
);

// email was a plain `unique: true` on the @Prop until members without one
// existed. Same trap as googleId and memberNumber above — a front-desk member
// has email present-but-null, and a plain unique index lets exactly one of
// them exist before the second collides on null.
//
// Mongoose will NOT convert the old index for you: autoIndex only creates, and
// creating this over an existing email_1 raises IndexOptionsConflict, which
// surfaces on the connection's error event rather than at a call site — the
// app boots looking healthy with the old index still enforcing the old rule.
// scripts/migrate-membership-tracking.js drops email_1 first, and must be run
// before this file ships.
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

// The identity a member with no email is found by, so it has to be unique for
// the find-or-create in JoinService to be safe under a double submit. Indexed
// on the normalized form rather than `phone`: the raw string is whatever the
// member typed, and three spellings of one number must not become three
// members.
UserSchema.index(
  { phoneNormalized: 1 },
  { unique: true, partialFilterExpression: { phoneNormalized: { $type: 'string' } } }
);
