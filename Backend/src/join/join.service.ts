import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '@/auth/schemas/user.schema';
import { PlansService } from '@/plans/plans.service';
import { BranchesService } from '@/branches/branches.service';
import { SettingsService } from '@/settings/settings.service';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';
import { InvoicesService } from '@/invoices/invoices.service';
import { PaymentService } from '@/payment/payment.service';
import {
  StartJoinDto,
  PreviewJoinDto,
  ReserveJoinDto,
  RecordMembershipDto,
  AGREEMENT_VERSION,
} from './dto';
import { PlanDocument } from '@/plans/schemas/plan.schema';
import { OffersService } from '@/offers/offers.service';
import { resolveOfferPricing } from '@/offers/offer-pricing';
import { SubscriptionDocument } from '@/subscriptions/schemas/subscription.schema';
import { InvoiceDocument } from '@/invoices/schemas/invoice.schema';
import { AuthService } from '@/auth/auth.service';
import { normalizePhone } from '@/common/utils/phone.util';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

interface Pricing {
  // The plan's undiscounted price. Billed on the invoice line, with the offer
  // shown beneath it as a discount, so a receipt explains itself rather than
  // quietly charging a number that matches no published price.
  listPriceMinorUnits: number;
  planPriceMinorUnits: number;
  joiningFeeMinorUnits: number;
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  // The offer that reduced the plan price, for showing on the review step.
  // Null when the member is paying list price.
  offerName: string | null;
}

@Injectable()
export class JoinService {
  private readonly logger = new Logger(JoinService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private plansService: PlansService,
    private branchesService: BranchesService,
    private settingsService: SettingsService,
    private subscriptionsService: SubscriptionsService,
    private invoicesService: InvoicesService,
    private paymentService: PaymentService,
    private offersService: OffersService,
    // Only for nextMemberNumber(): a member created at the desk must draw from
    // the same sequence as one who registered, or two people get number 1043.
    private authService: AuthService
  ) {}

  /**
   * Works out what a join actually costs.
   *
   * Deliberately the single source of that arithmetic: the preview endpoint
   * and the real join both call it, so the number quoted on the review step
   * cannot drift from the number charged.
   */
  private async price(plan: PlanDocument, isReturningLapsedMember = false): Promise<Pricing> {
    const settings = (await this.settingsService.getSettings()).data;

    // The same resolver the public pricing grid uses, so the price advertised
    // on /membership is the price that reaches the invoice. Resolved here on
    // the server on every quote and every join — the browser sends a plan id,
    // never a price.
    const offerPricing = resolveOfferPricing(plan, await this.offersService.findLive());
    const planPrice = offerPricing.effectivePriceMinorUnits;

    // A plan may override the gym-wide joining fee, and null is not the same
    // as zero: null means "use the gym default", zero means "this plan waives
    // it". Collapsing them into a falsy check would silently make every
    // waiving plan charge the default.
    const baseJoiningFee =
      plan.joiningFeeMinorUnits === null
        ? settings.joiningFeeMinorUnits
        : plan.joiningFeeMinorUnits;

    // Someone rejoining inside the grace window is not treated as a new
    // member. Whether that grace applies at all is a policy setting, because
    // it is a commercial decision rather than a technical one.
    const joiningFee =
      isReturningLapsedMember && !settings.chargeJoiningFeeOnLapsedRenewal ? 0 : baseJoiningFee;

    const subtotal = planPrice + joiningFee;

    // Memberships take no discount beyond the offer already reflected in
    // planPrice above. Coupon codes are a storefront instrument and are
    // deliberately not honoured here: an offer is already a public discount,
    // and letting a code stack on top of one is how a membership ends up sold
    // below cost without anybody deciding to.
    const taxable = subtotal;
    const tax = Math.round((taxable * settings.taxRateBasisPoints) / 10000);

    return {
      listPriceMinorUnits: offerPricing.listPriceMinorUnits,
      planPriceMinorUnits: planPrice,
      joiningFeeMinorUnits: joiningFee,
      subtotalMinorUnits: subtotal,
      discountMinorUnits: offerPricing.savingMinorUnits,
      taxMinorUnits: tax,
      totalMinorUnits: taxable + tax,
      offerName: offerPricing.appliedOffer?.name ?? null,
    };
  }

  /**
   * The invoice lines a membership bills as.
   *
   * The membership line carries the *list* price with the offer shown
   * separately as a discount, rather than a single already-reduced number —
   * a receipt that quotes a price matching nothing published is the kind of
   * thing members bring to the desk. Shared by every path that creates an
   * invoice so the three cannot drift.
   */
  private buildLines(plan: PlanDocument, pricing: Pricing) {
    return [
      {
        kind: 'membership' as const,
        description: `${plan.name} membership`,
        reference: plan._id as Types.ObjectId,
        unitPriceMinorUnits: pricing.listPriceMinorUnits,
        quantity: 1,
      },
      ...(pricing.joiningFeeMinorUnits > 0
        ? [
            {
              kind: 'joining_fee' as const,
              description: 'Joining fee',
              reference: null,
              unitPriceMinorUnits: pricing.joiningFeeMinorUnits,
              quantity: 1,
            },
          ]
        : []),
    ];
  }

  /**
   * Finds the member this phone number belongs to, or creates them.
   *
   * The heart of both offline paths. A membership has to hang off a User, but
   * the person agreeing it over WhatsApp has no account and no intention of
   * making one, so the account is created for them and phoneNormalized is what
   * identifies it. Matching on the normalized form is what stops "010…" and
   * "+20 10…" becoming two members with one membership each.
   *
   * The created account is deliberately unusable for signing in: the password
   * is random bytes nobody holds, exactly as googleLogin() does it. It exists
   * to own a membership, not to be logged into — though isEmailVerified is set
   * so that a member who later wants access can claim it by resetting their
   * password rather than being stuck behind an unverified-account error.
   */
  private async findOrCreateMemberByPhone(input: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
  }): Promise<UserDocument> {
    const phoneNormalized = normalizePhone(input.phone);
    if (!phoneNormalized) {
      throw new BadRequestException('That phone number does not look right');
    }

    const byPhone = await this.userModel.findOne({ phoneNormalized });
    if (byPhone) return byPhone;

    // Falls back to email so a returning member who changed their number is
    // recognised rather than duplicated — the same fallback googleLogin uses
    // when a Google account matches an existing local one.
    if (input.email) {
      const byEmail = await this.userModel.findOne({ email: input.email });
      if (byEmail) {
        try {
          byEmail.phone = input.phone;
          byEmail.phoneNormalized = phoneNormalized;
          await byEmail.save();
        } catch (error) {
          // That number is already on someone else's record. Keep the member
          // we found — the membership is theirs either way — and leave the
          // conflicting number for staff to sort out.
          if ((error as { code?: number }).code !== 11000) throw error;
          this.logger.warn(
            `Phone ${phoneNormalized} already belongs to another member; left ${byEmail._id} unchanged`
          );
        }
        return byEmail;
      }
    }

    const created = await this.userModel.create({
      email: input.email ?? null,
      password: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      phoneNormalized,
      isEmailVerified: true,
      memberNumber: await this.authService.nextMemberNumber(),
      role: 'member',
    });

    this.logger.log(`Created member ${created.memberNumber} from phone ${phoneNormalized}`);
    return created;
  }

  /** The single active branch, for the paths where the member never picks one. */
  private async resolveBranchId(explicit?: string): Promise<string> {
    if (explicit) {
      await this.branchesService.assertExists(explicit);
      return explicit;
    }

    const branches = (await this.branchesService.findAll()).data;
    if (branches.length === 0) {
      throw new BadRequestException('No branch is set up yet');
    }
    return (branches[0]._id as Types.ObjectId).toString();
  }

  /** Live quote for the review step. No side effects. */
  async preview(dto: PreviewJoinDto, userId: string | null) {
    const plan = await this.plansService.getActivePlanOrFail(dto.planId);
    const lapsed = userId ? await this.hasLapsedRecently(userId) : false;
    const pricing = await this.price(plan, lapsed);

    return {
      success: true,
      message: 'Quote calculated',
      data: {
        plan: {
          id: (plan._id as Types.ObjectId).toString(),
          name: plan.name,
          slug: plan.slug,
          durationValue: plan.durationValue,
          durationUnit: plan.durationUnit,
        },
        ...pricing,
      },
    };
  }

  // Whether this member's last membership ended inside the grace window, which
  // is what decides if they pay a joining fee again.
  private async hasLapsedRecently(userId: string): Promise<boolean> {
    const settings = (await this.settingsService.getSettings()).data;
    const cutoff = new Date(Date.now() - settings.lapsedRenewalGraceDays * 24 * 60 * 60 * 1000);

    const previous = await this.subscriptionsService.findAllForMember(userId);
    return previous.data.some(
      s =>
        (s.status === 'expired' || s.status === 'cancelled') &&
        new Date(s.endsAt).getTime() >= cutoff.getTime()
    );
  }

  /**
   * Runs a join: validates, saves the profile, creates the pending
   * subscription and invoice, and either opens a Paymob session or leaves the
   * invoice for the front desk.
   *
   * Nothing here activates anything. The membership turns on when the invoice
   * is settled, which is the webhook for a card and a staff member for cash.
   */
  async start(userId: string, dto: StartJoinDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('Account not found');
    }

    // One membership at a time. Without this, a double-submitted funnel or an
    // impatient member ends up paying twice and holding two overlapping terms.
    const existingActive = await this.subscriptionsService.findActiveForMember(userId);
    if (existingActive) {
      throw new ConflictException(
        'You already have an active membership. Renew or upgrade it from your account instead.'
      );
    }

    const plan = await this.plansService.getActivePlanOrFail(dto.planId);
    await this.branchesService.assertExists(dto.branchId);

    // A single-branch plan is bought against one branch, and that is the one
    // being joined — so nothing to check here beyond the branch existing. The
    // restriction bites at booking and check-in.
    const lapsed = await this.hasLapsedRecently(userId);
    const pricing = await this.price(plan, lapsed);

    // Contact details are saved before payment. If the card fails, the member
    // should not have to type all of it again.
    const parqHasFlag = dto.parqAnswers.some(Boolean);
    // The join funnel no longer asks the readiness question, so an empty
    // array means "not asked", not "asked, nothing to flag" — completedAt
    // stays null rather than timestamping a screen that never happened.
    const parqCompletedAt = dto.parqAnswers.length > 0 ? new Date() : null;
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          phone: dto.phone,
          ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
          ...(dto.gender ? { gender: dto.gender } : {}),
          emergencyContact: {
            name: dto.emergencyContactName,
            phone: dto.emergencyContactPhone,
            relationship: dto.emergencyContactRelationship ?? null,
          },
          ...(dto.fitnessGoals ? { fitnessGoals: dto.fitnessGoals } : {}),
          medicalNotes: dto.medicalNotes ?? null,
          parQ: {
            answers: dto.parqAnswers,
            // A yes on any question flags the account for staff sign-off. It
            // deliberately does not block the join: whether someone is fit to
            // train is a human judgement, and refusing them outright at a form
            // would just teach people to answer no.
            hasFlag: parqHasFlag,
            completedAt: parqCompletedAt,
            clearedByStaffAt: null,
          },
          homeBranch: new Types.ObjectId(dto.branchId),
        },
      }
    );

    const subscription = await this.subscriptionsService.createPending({
      memberId: userId,
      plan,
      branchId: dto.branchId,
      startsAt: new Date(dto.startsAt),
      agreementVersion: AGREEMENT_VERSION,
    });

    const lines = this.buildLines(plan, pricing);

    const settings = (await this.settingsService.getSettings()).data;

    const invoice = await this.invoicesService.create({
      memberId: userId,
      email: user.email,
      phone: dto.phone,
      lines,
      discountMinorUnits: pricing.discountMinorUnits,
      taxRateBasisPoints: settings.taxRateBasisPoints,
      offerName: pricing.offerName,
      paymentMethod: dto.paymentMethod,
      subscriptionId: (subscription._id as Types.ObjectId).toString(),
      idempotencyKey: dto.idempotencyKey ?? null,
    });

    // This method is card-only now. It used to branch here for cash and
    // InstaPay, because StartJoinDto accepted all three — which meant the
    // gateway route could mint an offline invoice that no member-facing flow
    // had asked staff to collect. Those methods live on reserve() below, which
    // is the one place an offline membership is created, so the branch is gone
    // rather than left unreachable. StartJoinDto now validates 'card' alone.
    if (!this.paymentService.isConfigured()) {
      throw new BadRequestException(
        'Card payment is not available at the moment. Please choose to pay at the gym.'
      );
    }

    // Paymob requires a real address in its billing data and rejects an empty
    // string. In practice this cannot fire — reaching here means an
    // authenticated account, and every account that can sign in registered
    // with an email — but members created at the desk have none, so the type
    // is nullable and the card path has to say what it needs.
    if (!user.email) {
      throw new BadRequestException(
        'Paying by card needs an email address on your account. Add one, or pay at the gym.'
      );
    }

    const session = await this.paymentService.createPaymentSession({
      amountCents: invoice.totalMinorUnits,
      merchantOrderId: invoice.invoiceNumber,
      items: lines.map(l => ({
        name: l.description,
        amount_cents: l.unitPriceMinorUnits,
        quantity: l.quantity,
      })),
      billingData: {
        first_name: user.firstName,
        last_name: user.lastName,
        phone_number: dto.phone,
        email: user.email,
        // Paymob rejects empty strings on these, and a membership has no
        // delivery address to give it — NA is the documented placeholder.
        street: 'NA',
        city: 'NA',
        state: 'NA',
        country: 'EG',
        postal_code: 'NA',
        apartment: 'NA',
        floor: 'NA',
        building: 'NA',
        shipping_method: 'NA',
      },
    });

    await this.invoicesService.attachPaymobOrder(
      invoice._id as Types.ObjectId,
      session.paymobOrderId
    );

    this.logger.log(
      `Join started: invoice ${invoice.invoiceNumber} for ${user.email} (${plan.name})`
    );

    return {
      success: true,
      message: 'Payment session created',
      data: {
        invoiceNumber: invoice.invoiceNumber,
        subscriptionId: (subscription._id as Types.ObjectId).toString(),
        totalMinorUnits: invoice.totalMinorUnits,
        paymentMethod: 'card' as const,
        iframeUrl: session.iframeUrl,
      },
    };
  }

  /**
   * A membership reserved from the website and paid offline.
   *
   * The same two documents a card join creates — a pending subscription and a
   * pending invoice — minus Paymob. That is the whole trick: the record exists
   * before the WhatsApp conversation starts, so nobody has to retype it
   * afterwards, and staff settle it with the same "record payment" button they
   * already use for cash.
   *
   * Public and unauthenticated, so it is defensive about everything: a
   * honeypot, a phone-keyed find-or-create, and no price anywhere in the DTO.
   */
  async reserve(dto: ReserveJoinDto) {
    // A filled honeypot is a bot. Answer as though it worked — telling it what
    // tripped is free tuition for whoever wrote it — and write nothing.
    if (dto.website) {
      this.logger.warn('Reservation rejected: honeypot filled');
      return {
        success: true,
        message: 'Reservation received',
        data: { status: 'reserved' as const, referenceCode: null },
      };
    }

    const plan = await this.plansService.getActivePlanOrFail(dto.planId);
    const branchId = await this.resolveBranchId(dto.branchId);

    // Checked before the member is created, not after. findOrCreateMemberByPhone
    // writes a User, and this route is public — validating the date only inside
    // createPending would leave an orphan account behind every time someone
    // mistyped a start date.
    this.subscriptionsService.assertStartDateAllowed(new Date(dto.startsAt));

    const member = await this.findOrCreateMemberByPhone(dto);
    const memberId = (member._id as Types.ObjectId).toString();

    // Already a member. Deliberately not a 409: this is a public form, and an
    // error page is a dead end for someone who was trying to give us money.
    // The frontend turns this into "you are already a member" plus a WhatsApp
    // link, which is the conversation they actually wanted.
    const existingActive = await this.subscriptionsService.findActiveForMember(memberId);
    if (existingActive) {
      return {
        success: true,
        message: 'You already have an active membership',
        data: {
          status: 'already_active' as const,
          activeUntil: existingActive.endsAt,
          planName: existingActive.planSnapshot.name,
        },
      };
    }

    // An unsettled reservation already exists. Same plan means this is a
    // double-tap or a revisit, so hand back what they already have — stronger
    // than an idempotency key, because it survives a new browser session.
    const pending = await this.subscriptionsService.findPendingForMember(memberId);
    if (pending) {
      if (pending.planSnapshot.plan.toString() === (plan._id as Types.ObjectId).toString()) {
        const existingInvoice = await this.invoicesService.findPendingForSubscription(
          pending._id as Types.ObjectId
        );
        if (existingInvoice) {
          return this.reservationResult(member, pending, existingInvoice, plan);
        }
      }

      // Changed their mind about the plan. Cancelling the old pending keeps
      // one live reservation per member; pending -> cancelled is legal and
      // sends no mail, since the cancellation email only fires when a
      // membership was actually active.
      await this.subscriptionsService.cancel(
        (pending._id as Types.ObjectId).toString(),
        'Replaced by a new reservation'
      );
    }

    const lapsed = await this.hasLapsedRecently(memberId);
    const pricing = await this.price(plan, lapsed);

    const subscription = await this.subscriptionsService.createPending({
      memberId,
      plan,
      branchId,
      startsAt: new Date(dto.startsAt),
      agreementVersion: AGREEMENT_VERSION,
      origin: 'website',
    });

    const settings = (await this.settingsService.getSettings()).data;
    const invoice = await this.invoicesService.create({
      memberId,
      email: member.email ?? dto.email ?? null,
      phone: dto.phone,
      lines: this.buildLines(plan, pricing),
      discountMinorUnits: pricing.discountMinorUnits,
      taxRateBasisPoints: settings.taxRateBasisPoints,
      offerName: pricing.offerName,
      paymentMethod: dto.paymentMethod,
      subscriptionId: (subscription._id as Types.ObjectId).toString(),
      idempotencyKey: dto.idempotencyKey ?? null,
    });

    this.logger.log(
      `Reservation ${subscription.referenceCode}: ${plan.name} for member ${member.memberNumber} (${dto.paymentMethod})`
    );

    return this.reservationResult(member, subscription, invoice, plan);
  }

  /**
   * A membership recorded by staff for a walk-in.
   *
   * Same machinery as reserve(), with two differences that only make sense
   * behind a login: the start date may be in the past, and the payment can be
   * settled in the same action because the cash is usually already in hand.
   *
   * Settling goes through recordCashPayment rather than activating directly,
   * so there stays exactly one path that turns a membership on — the
   * invoice.paid event — and receivedBy records which staff member took it.
   */
  async recordMembership(dto: RecordMembershipDto, staffId: string) {
    const plan = await this.plansService.getActivePlanOrFail(dto.planId);
    const branchId = await this.resolveBranchId(dto.branchId);

    // Same reasoning as reserve(): validate before creating anybody.
    this.subscriptionsService.assertStartDateAllowed(new Date(dto.startsAt), true);

    const member = await this.findOrCreateMemberByPhone(dto);
    const memberId = (member._id as Types.ObjectId).toString();

    const existingActive = await this.subscriptionsService.findActiveForMember(memberId);
    if (existingActive) {
      throw new ConflictException(
        `${member.firstName} already has an active membership until ${existingActive.endsAt.toISOString().slice(0, 10)}.`
      );
    }

    const lapsed = await this.hasLapsedRecently(memberId);
    const pricing = await this.price(plan, lapsed);

    const subscription = await this.subscriptionsService.createPending({
      memberId,
      plan,
      branchId,
      startsAt: new Date(dto.startsAt),
      agreementVersion: AGREEMENT_VERSION,
      origin: 'front_desk',
      allowBackdating: true,
    });

    const settings = (await this.settingsService.getSettings()).data;
    const invoice = await this.invoicesService.create({
      memberId,
      email: member.email ?? dto.email ?? null,
      phone: dto.phone,
      lines: this.buildLines(plan, pricing),
      discountMinorUnits: pricing.discountMinorUnits,
      taxRateBasisPoints: settings.taxRateBasisPoints,
      offerName: pricing.offerName,
      paymentMethod: dto.paymentMethod,
      subscriptionId: (subscription._id as Types.ObjectId).toString(),
    });

    if (dto.markPaid) {
      await this.invoicesService.recordCashPayment(
        (invoice._id as Types.ObjectId).toString(),
        staffId
      );
    }

    this.logger.log(
      `Front desk recorded ${subscription.referenceCode}: ${plan.name} for member ${member.memberNumber}, ${dto.markPaid ? 'paid' : 'unpaid'}`
    );

    return {
      success: true,
      message: dto.markPaid
        ? 'Membership recorded and activated'
        : 'Membership recorded, awaiting payment',
      data: {
        subscriptionId: (subscription._id as Types.ObjectId).toString(),
        referenceCode: subscription.referenceCode,
        invoiceNumber: invoice.invoiceNumber,
        memberId,
        memberNumber: member.memberNumber,
        totalMinorUnits: invoice.totalMinorUnits,
        paid: dto.markPaid,
      },
    };
  }

  /** Everything the reservation page needs to render, and to build the message. */
  private reservationResult(
    member: UserDocument,
    subscription: SubscriptionDocument,
    invoice: InvoiceDocument,
    plan: PlanDocument
  ) {
    return {
      success: true,
      message: 'Membership reserved',
      data: {
        status: 'reserved' as const,
        referenceCode: subscription.referenceCode,
        invoiceNumber: invoice.invoiceNumber,
        subscriptionId: (subscription._id as Types.ObjectId).toString(),
        totalMinorUnits: invoice.totalMinorUnits,
        paymentMethod: invoice.paymentMethod,
        startsAt: subscription.startsAt,
        memberName: `${member.firstName} ${member.lastName}`.trim(),
        planName: plan.name,
        durationValue: plan.durationValue,
        durationUnit: plan.durationUnit,
      },
    };
  }

  /** Looks a member up by phone, for the front-desk form. */
  async memberLookup(phone: string) {
    const phoneNormalized = normalizePhone(phone);
    if (!phoneNormalized) {
      throw new BadRequestException('That phone number does not look right');
    }

    const member = await this.userModel
      .findOne({ phoneNormalized })
      .select('firstName lastName email phone memberNumber');

    if (!member) {
      return { success: true, message: 'No member with that number', data: { found: false } };
    }

    const active = await this.subscriptionsService.findActiveForMember(
      (member._id as Types.ObjectId).toString()
    );

    return {
      success: true,
      message: 'Member found',
      data: {
        found: true,
        memberId: (member._id as Types.ObjectId).toString(),
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        memberNumber: member.memberNumber,
        hasActiveMembership: Boolean(active),
        activeUntil: active?.endsAt ?? null,
        activePlanName: active?.planSnapshot.name ?? null,
      },
    };
  }
}
