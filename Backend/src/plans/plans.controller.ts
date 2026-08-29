import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Plans')
@UseInterceptors(AuditInterceptor)
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'List active membership plans' })
  async findAll() {
    return this.plansService.findAll();
  }

  // Ahead of :slug, or "admin" would be read as a plan slug.
  @Roles('admin', 'staff')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all plans including inactive ones' })
  async findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Roles('admin', 'staff')
  @Get('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one plan by id, including inactive' })
  async findOneAdmin(@Param('id') id: string) {
    return this.plansService.findOneAdmin(id);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':slug')
  @ApiOperation({ summary: 'Get one active plan by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.plansService.findBySlug(slug);
  }

  @Roles('admin', 'staff')
  @Audit('plan.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a membership plan (admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Roles('admin', 'staff')
  @Audit('plan.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a membership plan (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Roles('admin', 'staff')
  @Audit('plan.deactivate')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a plan (admin only) — never hard-deletes' })
  async deactivate(@Param('id') id: string) {
    return this.plansService.deactivate(id);
  }
}
