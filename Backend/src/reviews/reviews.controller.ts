import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ModerateReviewDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import type { ReviewStatus } from './schemas/review.schema';

@ApiTags('Reviews')
@UseInterceptors(AuditInterceptor)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get('class/:classTypeId')
  @ApiOperation({ summary: 'Get approved reviews for a class type' })
  async listForClassType(@Param('classTypeId') classTypeId: string) {
    return this.reviewsService.listApprovedForClassType(classTypeId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review for a class you have attended' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.userId, dto);
  }

  @Roles('admin')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List reviews for moderation, optionally filtered by status (admin only)',
  })
  async listForModeration(@Query('status') status?: ReviewStatus) {
    return this.reviewsService.listForModeration(status);
  }

  @Roles('admin')
  @Audit('review.moderate')
  @Patch(':id/moderate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or reject a review (admin only)' })
  async moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, dto.status);
  }

  @Roles('admin')
  @Audit('review.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review (admin only)' })
  async remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
