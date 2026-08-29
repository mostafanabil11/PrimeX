import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Branches')
@UseInterceptors(AuditInterceptor)
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'List active branches' })
  async findAll() {
    return this.branchesService.findAll();
  }

  // Registered ahead of :slug — otherwise "admin" would be read as a branch
  // slug and this route would never be reached.
  @Roles('admin', 'staff')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all branches including inactive ones' })
  async findAllAdmin() {
    return this.branchesService.findAllAdmin();
  }

  @Roles('admin', 'staff')
  @Get('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one branch by id, including inactive' })
  async findOneAdmin(@Param('id') id: string) {
    return this.branchesService.findOneAdmin(id);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':slug')
  @ApiOperation({ summary: 'Get one active branch by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.branchesService.findBySlug(slug);
  }

  @Roles('admin')
  @Audit('branch.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a branch (admin only)' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  async create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Roles('admin')
  @Audit('branch.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a branch (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Roles('admin')
  @Audit('branch.deactivate')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a branch (admin only) — never hard-deletes' })
  async deactivate(@Param('id') id: string) {
    return this.branchesService.deactivate(id);
  }
}
