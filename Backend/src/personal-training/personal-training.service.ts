import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types, FilterQuery } from 'mongoose';
import { PtRequest, PtRequestDocument, PT_REQUEST_STATUSES } from './schemas/pt-request.schema';
import { generateReferenceCode } from '@/subscriptions/schemas/subscription.schema';
import { ReservePtDto, UpdatePtRequestDto, AddPtNoteDto, PtRequestQueryDto } from './dto';
import { TrainersService } from '@/trainers/trainers.service';
import { AuthService } from '@/auth/auth.service';

// Two submissions naming the same coach from the same number inside this
// window are one person tapping twice, not two requests. Matches the enquiry
// module's window, and for the same reason: long enough to absorb a double-tap
// and an impatient resubmit, short enough that somebody genuinely asking again
// tomorrow gets their own record.
//
// Scoped to the coach as well as the phone, unlike the enquiry version —
// asking for Marcus and then, five minutes later, for Tarek is two real
// requests, and collapsing them would lose the second coach entirely.
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class PersonalTrainingService {
  private readonly logger = new Logger(PersonalTrainingService.name);

  constructor(
    @InjectModel(PtRequest.name) private ptModel: Model<PtRequestDocument>,
    private trainersService: TrainersService,
    private authService: AuthService,
    private events: EventEmitter2
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid request id');
    }
    return new Types.ObjectId(id);
  }

  /**
   * Reserve personal training with a named coach.
   *
   * The order of operations is the same as the membership reservation, and it
   * is deliberate: validate everything that can be validated before creating a
   * member, because this endpoint is public and a failed validation after
   * findOrCreateMemberByPhone leaves an orphan account behind for every
   * mistyped date.
   *
   * No invoice is raised. See the note on the schema — there is no price yet.
   */
  async reserve(dto: ReservePtDto) {
    // A filled honeypot is a bot. Answer as though it worked — telling it what
    // tripped is free tuition for whoever wrote it — and write nothing.
    if (dto.website) {
      this.logger.warn('PT request rejected: honeypot filled');
      return {
        success: true,
        message: 'Request received',
        data: { status: 'reserved' as const, referenceCode: null },
      };
    }

    const trainer = await this.trainersService.findActiveByIdOrFail(dto.trainerId);

    const preferredStartsAt = new Date(`${dto.preferredStartsAt}T00:00:00.000Z`);
    if (Number.isNaN(preferredStartsAt.getTime())) {
      throw new BadRequestException('Please choose a start date');
    }
    // Yesterday is a typo, not a request. Compared against the start of today
    // so somebody reserving at 11pm for "today" is not told their own date is
    // in the past.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (preferredStartsAt.getTime() < startOfToday.getTime()) {
      throw new BadRequestException('Please choose a start date that has not already passed');
    }

    const member = await this.authService.findOrCreateMemberByPhone(dto);
    const memberId = member._id as Types.ObjectId;
    const trainerId = trainer._id as Types.ObjectId;

    // An open request for this coach already exists. Hand back the one they
    // have rather than raising a second — stronger than an idempotency key,
    // because it survives a new browser session, and it is what stops a member
    // who revisits the page from generating a queue of identical rows for
    // staff to reconcile.
    const existing = await this.ptModel
      .findOne({
        member: memberId,
        'trainerSnapshot.trainer': trainerId,
        status: { $in: ['new', 'contacted', 'scheduled'] },
      })
      .sort({ createdAt: -1 });

    if (existing) {
      return {
        success: true,
        message: 'You already have a session request with this coach',
        data: this.reservationResult(existing, { alreadyRequested: true }),
      };
    }

    // Same coach, same number, moments ago, but already closed off by staff —
    // rarer, and still a double-tap rather than a new intention.
    const recent = await this.ptModel
      .findOne({
        phone: dto.phone,
        'trainerSnapshot.trainer': trainerId,
        createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      })
      .sort({ createdAt: -1 });

    if (recent) {
      return {
        success: true,
        message: 'We already have your request',
        data: this.reservationResult(recent, { alreadyRequested: true }),
      };
    }

    const created = await this.ptModel.create({
      trainerSnapshot: {
        trainer: trainerId,
        name: trainer.name,
        slug: trainer.slug,
        headline: trainer.headline ?? null,
      },
      member: memberId,
      phone: dto.phone,
      memberName: `${member.firstName} ${member.lastName}`.trim(),
      preferredStartsAt,
      preferredTimes: dto.preferredTimes ?? null,
      goal: dto.goal ?? null,
      referenceCode: await this.nextReferenceCode(),
      status: 'new',
      origin: 'website',
    });

    // Emitted rather than awaited, matching the enquiry module: a mail outage
    // must not turn a captured request into a failed form submission. The
    // record already exists by this point.
    this.events.emit('pt.requested', {
      id: (created._id as Types.ObjectId).toString(),
      referenceCode: created.referenceCode,
      memberName: created.memberName,
      phone: created.phone,
      trainerName: trainer.name,
      preferredStartsAt: created.preferredStartsAt,
      goal: created.goal,
    });

    this.logger.log(
      `PT request ${created.referenceCode} — ${created.memberName} with ${trainer.name}`
    );

    return {
      success: true,
      message: 'Request received',
      data: this.reservationResult(created, { alreadyRequested: false }),
    };
  }

  /**
   * What the reserve form needs to build its confirmation and its WhatsApp
   * message. Shaped as one function so the three return paths above cannot
   * drift into three different payloads.
   */
  private reservationResult(doc: PtRequestDocument, opts: { alreadyRequested: boolean }) {
    return {
      status: 'reserved' as const,
      alreadyRequested: opts.alreadyRequested,
      requestId: (doc._id as Types.ObjectId).toString(),
      referenceCode: doc.referenceCode,
      memberName: doc.memberName,
      trainerName: doc.trainerSnapshot.name,
      trainerSlug: doc.trainerSnapshot.slug,
      preferredStartsAt: doc.preferredStartsAt.toISOString(),
      preferredTimes: doc.preferredTimes,
      goal: doc.goal,
    };
  }

  private async nextReferenceCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateReferenceCode();
      const existing = await this.ptModel.exists({ referenceCode: candidate });
      if (!existing) return candidate;
    }
    throw new ConflictException('Could not allocate a reference code — please try again');
  }

  // --- Staff ---

  async findAll(query: PtRequestQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const filter: FilterQuery<PtRequestDocument> = {};
    if (query.status) filter.status = query.status;
    if (query.trainer) filter['trainerSnapshot.trainer'] = this.toObjectId(query.trainer);

    if (query.q) {
      // Reference codes are uppercase and unambiguous, so an exact match on the
      // upper-cased term is tried alongside the name and phone search rather
      // than instead of it — staff paste a code from WhatsApp without thinking
      // about which field it belongs to.
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const loose = new RegExp(escaped, 'i');
      filter.$or = [
        { referenceCode: query.q.toUpperCase() },
        { memberName: loose },
        { phone: loose },
      ];
    }

    const [requests, total] = await Promise.all([
      this.ptModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('member', 'firstName lastName email phone memberNumber')
        .lean(),
      this.ptModel.countDocuments(filter),
    ]);

    // Counts per status, for the filter chips. One aggregation rather than one
    // countDocuments per status, which would be five round trips to render a
    // row of numbers.
    const grouped = await this.ptModel.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(PT_REQUEST_STATUSES.map(s => [s, 0])) as Record<
      string,
      number
    >;
    for (const row of grouped) counts[row._id] = row.n;

    return {
      success: true,
      message: 'Personal training requests retrieved',
      data: {
        requests,
        total,
        counts,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const request = await this.ptModel
      .findById(this.toObjectId(id))
      .populate('member', 'firstName lastName email phone memberNumber')
      .populate('notes.author', 'firstName lastName');

    if (!request) throw new NotFoundException('Request not found');

    return { success: true, message: 'Request retrieved', data: request };
  }

  async update(id: string, dto: UpdatePtRequestDto) {
    const request = await this.ptModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: dto },
      { new: true }
    );

    if (!request) throw new NotFoundException('Request not found');

    return { success: true, message: 'Request updated', data: request };
  }

  async addNote(id: string, dto: AddPtNoteDto, authorId: string) {
    const request = await this.ptModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $push: { notes: { body: dto.body, author: authorId, createdAt: new Date() } } },
      { new: true }
    );

    if (!request) throw new NotFoundException('Request not found');

    return { success: true, message: 'Note added', data: request };
  }
}
