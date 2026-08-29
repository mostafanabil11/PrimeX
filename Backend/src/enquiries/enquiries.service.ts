import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Enquiry, EnquiryDocument } from './schemas/enquiry.schema';
import { CreateEnquiryDto, UpdateEnquiryDto, AddEnquiryNoteDto, EnquiryQueryDto } from './dto';
import { definedFieldsOnly } from '@/common/utils/unique-slug.util';

// Two submissions from the same number inside this window are treated as the
// same person clicking twice, not as two leads. Long enough to cover a
// double-tap and an impatient resubmit; short enough that someone genuinely
// enquiring again the next day gets their own record.
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(
    @InjectModel(Enquiry.name) private enquiryModel: Model<EnquiryDocument>,
    private events: EventEmitter2
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid enquiry id');
    }
    return new Types.ObjectId(id);
  }

  async create(dto: CreateEnquiryDto) {
    // Honeypot. Answer as though it worked: telling a bot it was caught only
    // teaches whoever wrote it which field to leave alone next time.
    if (dto.website) {
      this.logger.warn(`Discarded a honeypot submission from ${dto.phone}`);
      return {
        success: true,
        message: 'Thanks — we will be in touch shortly.',
        data: { duplicate: false },
      };
    }

    const { website: _honeypot, ...fields } = dto;

    // Deduplicate on the phone number rather than rejecting outright, so a
    // double submit does not create two records for staff to reconcile — and
    // the caller still gets a success, because from their side it did work.
    const recent = await this.enquiryModel
      .findOne({
        phone: fields.phone,
        createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      })
      .sort({ createdAt: -1 });

    if (recent) {
      return {
        success: true,
        message: 'Thanks — we already have your details and will be in touch shortly.',
        data: { duplicate: true },
      };
    }

    const enquiry = await this.enquiryModel.create(fields);

    // Listeners send the staff notification and the confirmation. Emitted
    // rather than awaited so a mail outage cannot turn a captured lead into a
    // failed form submission.
    this.events.emit('enquiry.created', {
      id: (enquiry._id as Types.ObjectId).toString(),
      type: enquiry.type,
      name: enquiry.name,
      phone: enquiry.phone,
      email: enquiry.email,
      goal: enquiry.goal,
      message: enquiry.message,
    });

    return {
      success: true,
      message: 'Thanks — we will be in touch shortly.',
      data: { duplicate: false },
    };
  }

  async findAll(query: EnquiryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const filter: Record<string, unknown> = {};
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.branch) filter.branch = new Types.ObjectId(query.branch);

    const [enquiries, total, openCount] = await Promise.all([
      this.enquiryModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('branch', 'name slug')
        .populate('trainer', 'name slug')
        .populate('assignedTo', 'firstName lastName')
        .lean(),
      this.enquiryModel.countDocuments(filter),
      this.enquiryModel.countDocuments({ status: { $in: ['new', 'contacted'] } }),
    ]);

    return {
      success: true,
      message: 'Enquiries retrieved successfully',
      data: {
        enquiries,
        total,
        openCount,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const enquiry = await this.enquiryModel
      .findById(this.toObjectId(id))
      .populate('branch', 'name slug')
      .populate('trainer', 'name slug')
      .populate('assignedTo', 'firstName lastName')
      .lean();

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    return {
      success: true,
      message: 'Enquiry retrieved successfully',
      data: enquiry,
    };
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    const enquiry = await this.enquiryModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: definedFieldsOnly(dto) },
      { new: true }
    );

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    return {
      success: true,
      message: 'Enquiry updated successfully',
      data: enquiry,
    };
  }

  async addNote(id: string, dto: AddEnquiryNoteDto, authorId: string) {
    const enquiry = await this.enquiryModel.findByIdAndUpdate(
      this.toObjectId(id),
      {
        $push: {
          notes: {
            body: dto.body,
            author: new Types.ObjectId(authorId),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    return {
      success: true,
      message: 'Note added',
      data: enquiry,
    };
  }
}
