import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { generatePassword } from '@/common/utils/password.util';
import { Subscription, SubscriptionDocument } from '@/subscriptions/schemas/subscription.schema';
import {
  Invoice,
  InvoiceDocument,
  OFFERED_PAYMENT_METHODS,
} from '@/invoices/schemas/invoice.schema';
import { Booking, BookingDocument } from '@/bookings/schemas/booking.schema';
import { ClassSession, ClassSessionDocument } from '@/classes/schemas/class-session.schema';
import { Enquiry, EnquiryDocument } from '@/enquiries/schemas/enquiry.schema';
import { User, UserDocument } from '@/auth/schemas/user.schema';
import { CtaClick, CtaClickDocument } from '@/funnel/schemas/cta-click.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(ClassSession.name) private sessionModel: Model<ClassSessionDocument>,
    @InjectModel(Enquiry.name) private enquiryModel: Model<EnquiryDocument>,
    @InjectModel(CtaClick.name) private ctaClickModel: Model<CtaClickDocument>
  ) {}

  /**
   * The gym's own KPIs. Reads this module's models directly rather than
   * going through SubscriptionsService/InvoicesService/etc — this is
   * aggregation for a screen, not a write path, and routing it through five
   * services would buy nothing.
   */
  async getGymDashboard() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      activeMembers,
      newThisMonth,
      expiringSoon,
      revenueThisMonthAgg,
      todaySessions,
      openEnquiries,
      newLastMonth,
    ] = await Promise.all([
      this.subscriptionModel.countDocuments({ status: 'active', endsAt: { $gte: now } }),
      this.subscriptionModel.countDocuments({
        status: { $in: ['active', 'pending'] },
        createdAt: { $gte: startOfMonth },
      }),
      this.subscriptionModel
        .find({ status: 'active', endsAt: { $gte: now, $lte: in7Days } })
        .select('member endsAt planSnapshot.name')
        .populate('member', 'firstName lastName email')
        .sort({ endsAt: 1 })
        .limit(20),
      this.invoiceModel.aggregate<{ total: number }>([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalMinorUnits' } } },
      ]),
      this.sessionModel
        .find({ localDate: this.localDateString(startOfToday), status: { $ne: 'cancelled' } })
        .select('capacity bookedCount'),
      this.enquiryModel.countDocuments({ status: { $in: ['new', 'contacted'] } }),
      // Last month's new-member count, purely to show the trend arrow next to
      // this month's — a bare number means little without something to
      // compare it to.
      this.subscriptionModel.countDocuments({
        status: { $in: ['active', 'pending', 'expired', 'cancelled'] },
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
      }),
    ]);

    const fillRateToday =
      todaySessions.length === 0
        ? null
        : Math.round(
            (todaySessions.reduce((sum, s) => sum + s.bookedCount, 0) /
              Math.max(
                1,
                todaySessions.reduce((sum, s) => sum + s.capacity, 0)
              )) *
              100
          );

    const todaysBookingCount = await this.bookingModel.countDocuments({
      status: { $in: ['booked', 'attended'] },
      sessionStartsAt: { $gte: startOfToday, $lt: endOfToday },
    });

    return {
      success: true,
      message: 'Gym dashboard retrieved',
      data: {
        activeMembers,
        newMembersThisMonth: newThisMonth,
        newMembersLastMonth: newLastMonth,
        expiringSoon,
        revenueThisMonthMinorUnits: revenueThisMonthAgg[0]?.total ?? 0,
        todaysBookingCount,
        classFillRateToday: fillRateToday,
        openEnquiries,
      },
    };
  }

  // localDate on a session is stored as a plain YYYY-MM-DD string in the
  // gym's own timezone (see timezone.util.ts) — this mirrors that format so
  // the dashboard's "today" lines up with the timetable's "today" exactly.
  private localDateString(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(date);
  }

  /**
   * Two questions the gym cannot answer from anywhere else: is the website
   * bringing people in, and how much agreed money has not been collected.
   *
   * Rolling windows (`now - days`), not calendar months. getGymDashboard above
   * builds its month boundaries with server-local `new Date(y, m, d)`, which is
   * hours off Cairo on a UTC host — fine for a headline figure, wrong for a
   * conversion rate, and there is no reason to reproduce it here.
   */
  async getFunnelInsights(days = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [clicksByKind, reservations, converted, atRisk] = await Promise.all([
      this.ctaClickModel.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: '$kind', count: { $sum: 1 } } },
      ]),

      this.subscriptionModel.countDocuments({ origin: 'website', createdAt: { $gte: from } }),

      // A reservation from this cohort that ever activated — keyed on
      // createdAt like the denominator, not on when the money arrived.
      // Counting invoices by paidAt against reservations by createdAt lets
      // last month's reservation settling today push conversion over 100%.
      this.subscriptionModel.countDocuments({
        origin: 'website',
        createdAt: { $gte: from },
        status: { $in: ['active', 'frozen', 'expired'] },
      }),

      this.invoiceModel.aggregate([
        // Driven off OFFERED_PAYMENT_METHODS rather than a literal list. This
        // is the "awaiting payment" queue the front desk works from, and when
        // wallet was added the hardcoded ['cash','instapay'] here would have
        // silently hidden every wallet reservation from it — money owed, with
        // nothing on the dashboard to say so. Card is excluded for the right
        // reason: a pending card invoice is one Paymob has not settled, not
        // one a human should chase.
        {
          $match: {
            paymentStatus: 'pending',
            paymentMethod: { $in: [...OFFERED_PAYMENT_METHODS] },
          },
        },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscription',
            foreignField: '_id',
            as: 'sub',
          },
        },
        { $unwind: '$sub' },
        // Only reservations still waiting. A cancelled or replaced one is not
        // money anybody is going to collect.
        { $match: { 'sub.status': 'pending' } },
        {
          $addFields: {
            ageDays: { $dateDiff: { startDate: '$createdAt', endDate: '$$NOW', unit: 'day' } },
          },
        },
        {
          $facet: {
            summary: [
              { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalMinorUnits' } } },
            ],
            buckets: [
              {
                $bucket: {
                  groupBy: '$ageDays',
                  boundaries: [0, 3, 8, 15],
                  default: 'older',
                  output: { count: { $sum: 1 }, total: { $sum: '$totalMinorUnits' } },
                },
              },
            ],
            // The ten worth chasing first. Everything the dashboard needs to
            // offer a phone call and a WhatsApp message without another query.
            oldest: [
              { $sort: { createdAt: 1 } },
              { $limit: 10 },
              {
                $lookup: {
                  from: 'users',
                  localField: 'member',
                  foreignField: '_id',
                  as: 'memberDoc',
                },
              },
              { $unwind: { path: '$memberDoc', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  invoiceId: '$_id',
                  invoiceNumber: 1,
                  totalMinorUnits: 1,
                  paymentMethod: 1,
                  ageDays: 1,
                  createdAt: 1,
                  referenceCode: '$sub.referenceCode',
                  planName: '$sub.planSnapshot.name',
                  firstName: '$memberDoc.firstName',
                  lastName: '$memberDoc.lastName',
                  phone: '$memberDoc.phone',
                },
              },
            ],
          },
        },
      ]),
    ]);

    const clickCount = (kind: string) => clicksByKind.find(c => c._id === kind)?.count ?? 0;
    const reserveStarts = clickCount('reserve_start');
    const whatsappClicks = clickCount('whatsapp');
    const facet = atRisk[0] ?? { summary: [], buckets: [], oldest: [] };
    const summary = facet.summary[0] ?? { count: 0, total: 0 };

    // Capped at 100. The denominator is only the clicks we saw, and a
    // reservation can arrive without one — a bookmarked /join, a link someone
    // shared, an ad-blocker eating the beacon, storage turned off. Those make
    // the ratio exceed 100%, which reads as a bug rather than as good news.
    // Capping keeps the number answering its actual question ("is the form
    // losing people?") instead of inviting a wild-goose chase.
    const pct = (part: number, whole: number) =>
      whole === 0 ? null : Math.min(100, Math.round((part / whole) * 100));

    return {
      success: true,
      message: 'Funnel insights retrieved',
      data: {
        days,
        funnel: {
          // Split so form abandonment is visible on its own: reserve_start
          // against reservations is the number that says whether putting a
          // form in front of the WhatsApp handoff was worth it.
          reserveStarts,
          whatsappClicks,
          reservations,
          converted,
          startToReservePct: pct(reservations, reserveStarts),
          reserveToPaidPct: pct(converted, reservations),
        },
        atRisk: {
          count: summary.count,
          totalMinorUnits: summary.total,
          buckets: facet.buckets,
          oldest: facet.oldest,
        },
      },
    };
  }

  // --- Staff accounts ---
  //
  // Every method here refuses to touch an admin. Front-desk accounts are
  // created, reset and switched off from the UI; admins are made in a shell
  // (scripts/set-admin-password.js) and can only be unmade there. That keeps
  // one bright line: whatever an admin session can do, it cannot mint or
  // disable the owner's own way back in.

  async listStaff() {
    const staff = await this.userModel
      .find({ role: 'staff' })
      .select('firstName lastName email isActive createdAt lastLoginAttempt')
      .sort({ isActive: -1, firstName: 1 });

    return { success: true, message: 'Staff retrieved', data: staff };
  }

  async createStaff(dto: CreateStaffDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }

    // Returned once in the response and never again — only the hash is kept,
    // so a lost password is a reset rather than a lookup.
    const password = generatePassword();

    const user = await this.userModel.create({
      email,
      password: await bcrypt.hash(password, 10),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'staff',
      // No mailbox is involved, so there is no verification link to click and
      // login would otherwise refuse the account forever.
      isEmailVerified: true,
      isActive: true,
    });

    this.logger.log(`Staff account created: ${email}`);

    return {
      success: true,
      message: 'Staff account created',
      data: {
        _id: (user._id as Types.ObjectId).toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        // The only time this is ever visible.
        password,
      },
    };
  }

  async resetStaffPassword(id: string) {
    const user = await this.findStaffOrFail(id);
    const password = generatePassword();

    user.password = await bcrypt.hash(password, 10);
    // A reset is also the fix for "they are locked out", so clear that too.
    user.loginAttempts = 0;
    user.lockedUntil = null;
    // Every existing session dies: a password reset that leaves old logins
    // working is not a reset.
    user.sessions = [];
    await user.save();

    this.logger.log(`Staff password reset: ${user.email}`);

    return { success: true, message: 'Password reset', data: { password } };
  }

  async setStaffActive(id: string, dto: UpdateStaffDto) {
    const user = await this.findStaffOrFail(id);

    user.isActive = dto.isActive;

    // Clearing sessions is what makes switching someone off immediate. Without
    // it their refresh token keeps rotating and they stay signed in; with it
    // the next rotation fails and the access token expires within minutes.
    if (!dto.isActive) {
      user.sessions = [];
    }

    await user.save();

    this.logger.log(`Staff ${user.email} ${dto.isActive ? 'reactivated' : 'deactivated'}`);

    return {
      success: true,
      message: dto.isActive ? 'Access restored' : 'Access revoked',
      data: { _id: id, isActive: user.isActive },
    };
  }

  /** Loads a staff account, refusing anything that is not one. */
  private async findStaffOrFail(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid staff id');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('Staff account not found');
    }

    // The guard that matters. Without it these routes would reset an admin's
    // password or switch the owner out of their own gym.
    if (user.role !== 'staff') {
      throw new BadRequestException('That account is not a staff account');
    }

    return user;
  }

  async listCustomers(query: AdminCustomerQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.q) {
      const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const or: Record<string, unknown>[] = [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
      ];

      // An all-digits search is almost certainly a member reading their
      // number out at the desk, so match it exactly as a number — the regex
      // branches above only ever match strings, and memberNumber is stored
      // as a number so it would never be found by them.
      if (/^\d+$/.test(query.q.trim())) {
        or.push({ memberNumber: Number(query.q.trim()) });
      }

      filter.$or = or;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('email firstName lastName role isEmailVerified authProvider createdAt memberNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.userModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Customers retrieved',
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getCustomer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid member id');
    }

    const user = await this.userModel
      .findById(id)
      .select(
        'email firstName lastName phone role isEmailVerified authProvider createdAt memberNumber'
      );
    if (!user) {
      throw new NotFoundException('Member not found');
    }

    return { success: true, message: 'Member retrieved', data: user };
  }

  async listAuditLog(query: AdminAuditQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = query.action;

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Audit log retrieved',
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
