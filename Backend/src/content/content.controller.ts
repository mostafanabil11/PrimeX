import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { UpdateContentBlocksDto, CreateTestimonialDto, UpdateTestimonialDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Content')
@UseInterceptors(AuditInterceptor)
@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'All site copy, with defaults already applied' })
  async getAll() {
    return this.contentService.getAllContent();
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('testimonials')
  @ApiOperation({ summary: 'List active testimonials' })
  async getTestimonials() {
    return this.contentService.findTestimonials();
  }

  @Roles('admin', 'staff')
  @Get('admin/testimonials')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all testimonials including hidden ones' })
  async getTestimonialsAdmin() {
    return this.contentService.findTestimonialsAdmin();
  }

  @Roles('admin', 'staff')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Site copy plus the field metadata the editor needs' })
  async getForAdmin() {
    return this.contentService.getContentForAdmin();
  }

  @Roles('admin')
  @Audit('content.update')
  @Put()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update one or more content blocks (admin only)' })
  async update(@Body() dto: UpdateContentBlocksDto) {
    return this.contentService.updateContent(dto);
  }

  @Roles('admin')
  @Audit('content.reset')
  @Delete('block/:key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear an override so the key shows its default again' })
  async reset(@Param('key') key: string) {
    return this.contentService.resetContent(key);
  }

  @Roles('admin')
  @Audit('testimonial.create')
  @Post('testimonials')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a testimonial (admin only)' })
  @ApiResponse({ status: 201, description: 'Testimonial created' })
  async createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.contentService.createTestimonial(dto);
  }

  @Roles('admin')
  @Audit('testimonial.update')
  @Patch('testimonials/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a testimonial (admin only)' })
  async updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.contentService.updateTestimonial(id, dto);
  }

  @Roles('admin')
  @Audit('testimonial.delete')
  @Delete('testimonials/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a testimonial (admin only)' })
  async deleteTestimonial(@Param('id') id: string) {
    return this.contentService.deleteTestimonial(id);
  }
}
