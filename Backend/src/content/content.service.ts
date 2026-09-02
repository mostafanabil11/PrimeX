import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContentBlock, ContentBlockDocument } from './schemas/content-block.schema';
import { Testimonial, TestimonialDocument } from './schemas/testimonial.schema';
import { CONTENT_DEFINITIONS, getContentDefinition, ContentDefinition } from './content.registry';
import { UpdateContentBlocksDto, CreateTestimonialDto, UpdateTestimonialDto } from './dto';
import { definedFieldsOnly } from '@/common/utils/unique-slug.util';

// What a page actually consumes: every known key resolved to a value, with
// defaults already applied. Components never have to handle a missing key.
export type ResolvedContent = Record<string, string | string[]>;

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(ContentBlock.name) private blockModel: Model<ContentBlockDocument>,
    @InjectModel(Testimonial.name) private testimonialModel: Model<TestimonialDocument>
  ) {}

  private resolve(
    definitions: ContentDefinition[],
    stored: Map<string, ContentBlockDocument>,
    locale: 'en' | 'ar' = 'en'
  ): ResolvedContent {
    const out: ResolvedContent = {};

    for (const definition of definitions) {
      const row = stored.get(definition.key);

      if (!row) {
        out[definition.key] = definition.default;
        continue;
      }

      if (definition.type === 'list') {
        // An explicitly emptied list is a real editorial choice and must
        // survive; only an absent one falls back.
        out[definition.key] = locale === 'ar'
          ? row.valuesAr?.length ? row.valuesAr : row.values ?? (definition.default as string[])
          : row.values ?? (definition.default as string[]);
      } else {
        // A blank string means the same thing — someone cleared the field on
        // purpose — but an empty headline would render as a gap, so blank
        // falls back to the default rather than shipping a hole.
        out[definition.key] = locale === 'ar' && row.valueAr?.trim()
          ? row.valueAr
          : row.value?.trim() ? row.value : (definition.default as string);
      }
    }

    return out;
  }

  // Public: the whole site's copy in one request, so a page render is a single
  // round trip rather than one per block.
  async getAllContent(locale: 'en' | 'ar' = 'en') {
    const rows = await this.blockModel.find().lean();
    const stored = new Map(rows.map(r => [r.key, r as unknown as ContentBlockDocument]));

    return {
      success: true,
      message: 'Content retrieved successfully',
      data: this.resolve(CONTENT_DEFINITIONS, stored, locale),
    };
  }

  // Admin: the same values, plus the registry metadata the editing screen
  // needs — label, type, hint, max length — and whether each key has been
  // overridden or is still showing its default.
  async getContentForAdmin() {
    const rows = await this.blockModel.find().lean();
    const stored = new Map(rows.map(r => [r.key, r as unknown as ContentBlockDocument]));
    const resolved = this.resolve(CONTENT_DEFINITIONS, stored);

    return {
      success: true,
      message: 'Content retrieved successfully',
      data: CONTENT_DEFINITIONS.map(definition => ({
        ...definition,
        current: resolved[definition.key],
        currentAr: definition.type === 'list'
          ? stored.get(definition.key)?.valuesAr ?? []
          : stored.get(definition.key)?.valueAr ?? '',
        isOverridden: stored.has(definition.key),
      })),
    };
  }

  async updateContent(dto: UpdateContentBlocksDto) {
    // Validate every block before writing any of them. A partial apply would
    // leave the site half-edited with no indication which half.
    const operations = dto.blocks.map(block => {
      const definition = getContentDefinition(block.key);
      if (!definition) {
        throw new BadRequestException(
          `Unknown content key "${block.key}". Editable keys are defined in content.registry.ts.`
        );
      }

      if (definition.type === 'list') {
        if (block.values === undefined && block.valuesAr === undefined) {
          throw new BadRequestException(`"${block.key}" is a list — send an English or Arabic values array`);
        }
        const tooLong = [...(block.values ?? []), ...(block.valuesAr ?? [])].find(v => v.length > definition.maxLength);
        if (tooLong) {
          throw new BadRequestException(
            `An item in "${block.key}" is longer than ${definition.maxLength} characters`
          );
        }
        return {
          updateOne: {
            filter: { key: block.key },
            update: { $set: {
              ...(block.values !== undefined ? { values: block.values, value: null } : {}),
              ...(block.valuesAr !== undefined ? { valuesAr: block.valuesAr, valueAr: null } : {}),
            } },
            upsert: true,
          },
        };
      }

      if ((block.value === undefined || block.value === null) && (block.valueAr === undefined || block.valueAr === null)) {
        throw new BadRequestException(`"${block.key}" is text — send an English or Arabic value`);
      }
      if ((block.value?.length ?? 0) > definition.maxLength || (block.valueAr?.length ?? 0) > definition.maxLength) {
        throw new BadRequestException(
          `"${block.key}" is longer than ${definition.maxLength} characters`
        );
      }

      return {
        updateOne: {
          filter: { key: block.key },
          update: { $set: {
            ...(block.value !== undefined ? { value: block.value, values: undefined } : {}),
            ...(block.valueAr !== undefined ? { valueAr: block.valueAr, valuesAr: undefined } : {}),
          } },
          upsert: true,
        },
      };
    });

    await this.blockModel.bulkWrite(operations);

    return this.getContentForAdmin();
  }

  // Clears an override so the key shows its registry default again. The only
  // way back — saving an empty string would look like the same thing but store
  // a blank row.
  async resetContent(key: string) {
    if (!getContentDefinition(key)) {
      throw new BadRequestException(`Unknown content key "${key}"`);
    }

    await this.blockModel.deleteOne({ key });

    return {
      success: true,
      message: 'Content reset to its default',
      data: { key },
    };
  }

  // --- Testimonials ---

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid testimonial id');
    }
    return new Types.ObjectId(id);
  }

  async findTestimonials() {
    const testimonials = await this.testimonialModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return {
      success: true,
      message: 'Testimonials retrieved successfully',
      data: testimonials,
    };
  }

  async findTestimonialsAdmin() {
    const testimonials = await this.testimonialModel
      .find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return {
      success: true,
      message: 'Testimonials retrieved successfully',
      data: testimonials,
    };
  }

  async createTestimonial(dto: CreateTestimonialDto) {
    const testimonial = await this.testimonialModel.create({ ...dto });

    return {
      success: true,
      message: 'Testimonial created successfully',
      data: testimonial,
    };
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    const testimonial = await this.testimonialModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: definedFieldsOnly(dto) },
      { new: true }
    );

    if (!testimonial) {
      throw new NotFoundException('Testimonial not found');
    }

    return {
      success: true,
      message: 'Testimonial updated successfully',
      data: testimonial,
    };
  }

  // Genuinely deleted, unlike branches and plans. Nothing references a
  // testimonial, and a quote someone has asked to withdraw should actually go.
  async deleteTestimonial(id: string) {
    const testimonial = await this.testimonialModel.findByIdAndDelete(this.toObjectId(id));
    if (!testimonial) {
      throw new NotFoundException('Testimonial not found');
    }

    return {
      success: true,
      message: 'Testimonial deleted successfully',
      data: { id },
    };
  }
}
