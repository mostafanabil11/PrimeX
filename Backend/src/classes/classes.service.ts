import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RecurrenceRule,
  RecurrenceRuleDocument,
  ClassSession,
  ClassSessionDocument,
} from './schemas/class-session.schema';
import { ClassType, ClassTypeDocument } from '@/class-types/schemas/class-type.schema';
import { BookingsService } from '@/bookings/bookings.service';
import { SettingsService } from '@/settings/settings.service';
import { definedFieldsOnly } from '@/common/utils/unique-slug.util';
import {
  zonedTimeToUtc,
  utcToZonedDate,
  utcToZonedWeekday,
  addLocalDays,
  GYM_TIMEZONE,
} from '@/common/utils/timezone.util';

// Generate a little beyond the booking horizon, so the far edge of the
// timetable is always populated rather than appearing the moment the cron
// happens to run.
const GENERATION_BUFFER_DAYS = 7;

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    @InjectModel(RecurrenceRule.name) private ruleModel: Model<RecurrenceRuleDocument>,
    @InjectModel(ClassSession.name) private sessionModel: Model<ClassSessionDocument>,
    @InjectModel(ClassType.name) private classTypeModel: Model<ClassTypeDocument>,
    private bookingsService: BookingsService,
    private settingsService: SettingsService
  ) {}

  private toObjectId(id: string, label = 'session'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return new Types.ObjectId(id);
  }

  // --- Recurrence rules ---

  async createRule(input: {
    classTypeId: string;
    branchId: string;
    trainerId?: string | null;
    weekday: string;
    startTime: string;
    durationMinutes?: number;
    capacity?: number;
    room?: string | null;
    womenOnly?: boolean;
    effectiveFrom: string;
    effectiveUntil?: string | null;
  }) {
    const classType = await this.classTypeModel.findById(
      this.toObjectId(input.classTypeId, 'class type')
    );
    if (!classType) {
      throw new NotFoundException('Class type not found');
    }

    const rule = await this.ruleModel.create({
      classType: classType._id,
      branch: this.toObjectId(input.branchId, 'branch'),
      trainer: input.trainerId ? this.toObjectId(input.trainerId, 'trainer') : null,
      weekday: input.weekday,
      startTime: input.startTime,
      // Falls back to the class type's own duration and capacity, so a
      // schedule builder only has to state what differs from the template.
      durationMinutes: input.durationMinutes ?? classType.durationMinutes,
      capacity: input.capacity ?? classType.defaultCapacity,
      room: input.room ?? null,
      womenOnly: input.womenOnly ?? false,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null,
    });

    // Fill the horizon immediately, so a rule added this morning shows on the
    // timetable this morning rather than after tonight's cron.
    const created = await this.generateForRule(rule);

    // A slot starting beyond the horizon legitimately generates nothing yet,
    // and "0 sessions added" reads like a failure. Say what actually happened.
    const message =
      created > 0
        ? `Slot created — ${created} session${created === 1 ? '' : 's'} added to the timetable`
        : `Slot created. It starts on ${rule.effectiveFrom}, so sessions will appear as the timetable reaches that date.`;

    return {
      success: true,
      message,
      data: rule,
    };
  }

  async findRules(branchId?: string) {
    const query: Record<string, unknown> = { isActive: true };
    if (branchId) {
      query.branch = this.toObjectId(branchId, 'branch');
    }

    const rules = await this.ruleModel
      .find(query)
      .sort({ weekday: 1, startTime: 1 })
      .populate('classType', 'name slug colorToken durationMinutes')
      .populate('branch', 'name slug')
      .populate('trainer', 'name slug')
      .lean();

    return {
      success: true,
      message: 'Schedule retrieved successfully',
      data: rules,
    };
  }

  /**
   * Stops a recurring slot.
   *
   * Future occurrences that nobody has booked are deleted outright; ones with
   * bookings are cancelled so the members on them are told. Past sessions are
   * never touched — they are a record of what happened.
   */
  async deactivateRule(ruleId: string) {
    const rule = await this.ruleModel.findById(this.toObjectId(ruleId, 'rule'));
    if (!rule) {
      throw new NotFoundException('Slot not found');
    }

    rule.isActive = false;
    await rule.save();

    const now = new Date();
    const upcoming = await this.sessionModel.find({
      rule: rule._id,
      startsAt: { $gte: now },
      status: 'scheduled',
    });

    let cancelled = 0;
    let removed = 0;

    for (const session of upcoming) {
      if (session.bookedCount > 0) {
        await this.cancelSession(
          (session._id as Types.ObjectId).toString(),
          'This class has been taken off the timetable'
        );
        cancelled += 1;
      } else {
        await this.sessionModel.deleteOne({ _id: session._id });
        removed += 1;
      }
    }

    return {
      success: true,
      message: `Slot stopped. ${removed} empty session${removed === 1 ? '' : 's'} removed, ${cancelled} cancelled with members notified.`,
      data: rule,
    };
  }

  // --- Session generation ---

  /**
   * Materialises occurrences for one rule out to the horizon.
   *
   * Idempotent by construction: each insert carries the rule id and the exact
   * instant, and a unique partial index on that pair means a second run
   * inserts nothing rather than doubling the timetable. Sessions a staff
   * member has edited are matched by the same key, so they are skipped rather
   * than reverted.
   */
  private async generateForRule(rule: RecurrenceRuleDocument): Promise<number> {
    const settings = (await this.settingsService.getSettings()).data;
    const horizonDays = settings.bookingHorizonDays + GENERATION_BUFFER_DAYS;

    const today = utcToZonedDate(new Date(), GYM_TIMEZONE);
    let cursor = rule.effectiveFrom > today ? rule.effectiveFrom : today;
    const lastDay = addLocalDays(today, horizonDays);

    const docs: Record<string, unknown>[] = [];

    for (let guard = 0; guard < 400 && cursor <= lastDay; guard++) {
      if (rule.effectiveUntil && cursor > rule.effectiveUntil) {
        break;
      }

      const startsAt = zonedTimeToUtc(cursor, rule.startTime, GYM_TIMEZONE);

      // Weekday is decided in local terms — a 00:30 class on a Sunday morning
      // in Cairo is a Saturday instant in UTC, and grouping it by the UTC day
      // would put it on the wrong row of the timetable.
      if (utcToZonedWeekday(startsAt, GYM_TIMEZONE) === rule.weekday) {
        docs.push({
          classType: rule.classType,
          branch: rule.branch,
          trainer: rule.trainer,
          startsAt,
          endsAt: new Date(startsAt.getTime() + rule.durationMinutes * 60000),
          localDate: cursor,
          capacity: rule.capacity,
          bookedCount: 0,
          room: rule.room,
          womenOnly: rule.womenOnly,
          status: 'scheduled',
          rule: rule._id,
        });
      }

      cursor = addLocalDays(cursor, 1);
    }

    if (docs.length === 0) {
      return 0;
    }

    // ordered: false so one collision — an occurrence that already exists —
    // does not abandon the rest of the batch.
    try {
      const result = await this.sessionModel.insertMany(docs, { ordered: false });
      return result.length;
    } catch (err) {
      const inserted = (err as { insertedDocs?: unknown[] }).insertedDocs?.length ?? 0;
      const code = (err as { code?: number }).code;
      // 11000 here is expected and means "already generated".
      if (code !== 11000 && !(err as { writeErrors?: unknown[] }).writeErrors) {
        throw err;
      }
      return inserted;
    }
  }

  /** Extends the horizon for every live rule. Run nightly. */
  async generateHorizon(): Promise<number> {
    const rules = await this.ruleModel.find({ isActive: true });
    let total = 0;

    for (const rule of rules) {
      try {
        total += await this.generateForRule(rule);
      } catch (err) {
        // One bad rule must not stop the rest of the timetable being built.
        this.logger.error(
          `Could not generate sessions for rule ${rule._id}: ${(err as Error).message}`
        );
      }
    }

    if (total > 0) {
      this.logger.log(`Generated ${total} class session(s)`);
    }
    return total;
  }

  // --- Sessions ---

  /**
   * The timetable: sessions in a local-date range, optionally filtered.
   *
   * Dates are local calendar strings rather than instants, because that is
   * what a member means by "what is on this week".
   */
  async findSessions(query: {
    from?: string;
    to?: string;
    branch?: string;
    classType?: string;
    trainer?: string;
  }) {
    const from = query.from ?? utcToZonedDate(new Date(), GYM_TIMEZONE);
    const settings = (await this.settingsService.getSettings()).data;
    const to = query.to ?? addLocalDays(from, settings.bookingHorizonDays);

    const filter: Record<string, unknown> = {
      localDate: { $gte: from, $lte: to },
      status: { $ne: 'cancelled' },
    };
    if (query.branch) filter.branch = this.toObjectId(query.branch, 'branch');
    if (query.classType) filter.classType = this.toObjectId(query.classType, 'class type');
    if (query.trainer) filter.trainer = this.toObjectId(query.trainer, 'trainer');

    const sessions = await this.sessionModel
      .find(filter)
      .sort({ startsAt: 1 })
      .populate('classType', 'name slug colorToken intensity durationMinutes')
      .populate('branch', 'name slug')
      .populate('trainer', 'name slug')
      .lean();

    return {
      success: true,
      message: 'Timetable retrieved successfully',
      data: {
        from,
        to,
        // Sent so the client does not have to guess which zone the wall-clock
        // times it renders are in.
        timezone: GYM_TIMEZONE,
        sessions,
      },
    };
  }

  async findSession(id: string) {
    const session = await this.sessionModel
      .findById(this.toObjectId(id, 'session'))
      .populate('classType', 'name slug description colorToken intensity equipment')
      .populate('branch', 'name slug city')
      .populate('trainer', 'name slug headline')
      .lean();

    if (!session) {
      throw new NotFoundException('Class not found');
    }

    return {
      success: true,
      message: 'Class retrieved successfully',
      data: session,
    };
  }

  /**
   * Edits one occurrence, marking it overridden so regeneration leaves it
   * alone. Without that flag, fixing next Tuesday's trainer would be quietly
   * reverted the next time the horizon extended.
   */
  async updateSession(
    id: string,
    dto: {
      trainer?: string | null;
      capacity?: number;
      room?: string | null;
      womenOnly?: boolean;
      startsAt?: string;
    }
  ) {
    const session = await this.sessionModel.findById(this.toObjectId(id, 'session'));
    if (!session) {
      throw new NotFoundException('Class not found');
    }

    const update = definedFieldsOnly(dto) as Record<string, unknown>;

    // Capacity cannot be cut below the number already booked — that would
    // leave members holding places the session says do not exist.
    if (typeof update.capacity === 'number' && update.capacity < session.bookedCount) {
      throw new BadRequestException(
        `${session.bookedCount} ${session.bookedCount === 1 ? 'person is' : 'people are'} already booked, so capacity cannot go below that`
      );
    }

    if (update.trainer !== undefined) {
      update.trainer = update.trainer ? this.toObjectId(String(update.trainer), 'trainer') : null;
    }

    if (typeof update.startsAt === 'string') {
      const startsAt = new Date(update.startsAt);
      update.startsAt = startsAt;
      update.endsAt = new Date(
        startsAt.getTime() + (session.endsAt.getTime() - session.startsAt.getTime())
      );
      update.localDate = utcToZonedDate(startsAt, GYM_TIMEZONE);
    }

    update.isOverridden = true;

    const updated = await this.sessionModel.findByIdAndUpdate(
      session._id,
      { $set: update },
      { new: true }
    );

    return {
      success: true,
      message: 'Class updated',
      data: updated,
    };
  }

  /** Cancels one occurrence and releases everyone booked onto it. */
  async cancelSession(id: string, reason: string | null) {
    const session = await this.sessionModel.findById(this.toObjectId(id, 'session'));
    if (!session) {
      throw new NotFoundException('Class not found');
    }
    if (session.status === 'cancelled') {
      return {
        success: true,
        message: 'That class was already cancelled',
        data: session,
      };
    }

    session.status = 'cancelled';
    session.cancellationReason = reason;
    session.isOverridden = true;
    await session.save();

    const released = await this.bookingsService.releaseSessionBookings(
      session._id as Types.ObjectId,
      reason
    );

    return {
      success: true,
      message: `Class cancelled. ${released} member${released === 1 ? '' : 's'} notified and refunded.`,
      data: session,
    };
  }

  /** Closes off sessions that have finished, so rosters stop being editable. */
  async completePastSessions(): Promise<number> {
    const result = await this.sessionModel.updateMany(
      { status: 'scheduled', endsAt: { $lt: new Date() } },
      { $set: { status: 'completed' } }
    );
    return result.modifiedCount;
  }
}
