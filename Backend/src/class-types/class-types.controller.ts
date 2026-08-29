import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClassTypesService } from './class-types.service';
import { CreateClassTypeDto, UpdateClassTypeDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Class types')
@UseInterceptors(AuditInterceptor)
@Controller('class-types')
export class ClassTypesController {
  constructor(private classTypesService: ClassTypesService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'List active class types' })
  async findAll() {
    return this.classTypesService.findAll();
  }

  // Registered ahead of :slug, or "admin" would be read as a class-type slug.
  @Roles('admin', 'staff')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all class types including inactive ones' })
  async findAllAdmin() {
    return this.classTypesService.findAllAdmin();
  }

  @Roles('admin', 'staff')
  @Get('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one class type by id, including inactive' })
  async findOneAdmin(@Param('id') id: string) {
    return this.classTypesService.findOneAdmin(id);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':slug')
  @ApiOperation({ summary: 'Get one active class type by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.classTypesService.findBySlug(slug);
  }

  @Roles('admin')
  @Audit('classType.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a class type (admin only)' })
  @ApiResponse({ status: 201, description: 'Class type created' })
  async create(@Body() dto: CreateClassTypeDto) {
    return this.classTypesService.create(dto);
  }

  @Roles('admin')
  @Audit('classType.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a class type (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassTypeDto) {
    return this.classTypesService.update(id, dto);
  }

  @Roles('admin')
  @Audit('classType.deactivate')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a class type (admin only) — never hard-deletes' })
  async deactivate(@Param('id') id: string) {
    return this.classTypesService.deactivate(id);
  }
}
