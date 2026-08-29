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
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto, UpdateTrainerDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Trainers')
@UseInterceptors(AuditInterceptor)
@Controller('trainers')
export class TrainersController {
  constructor(private trainersService: TrainersService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiQuery({ name: 'branch', required: false, description: 'Filter by branch id' })
  @ApiOperation({ summary: 'List active trainers, optionally filtered by branch' })
  async findAll(@Query('branch') branch?: string) {
    return this.trainersService.findAll(branch);
  }

  // Registered ahead of :slug, or "admin" would be read as a trainer slug.
  @Roles('admin', 'staff')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all trainers including inactive ones' })
  async findAllAdmin() {
    return this.trainersService.findAllAdmin();
  }

  @Roles('admin', 'staff')
  @Get('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one trainer by id, including inactive' })
  async findOneAdmin(@Param('id') id: string) {
    return this.trainersService.findOneAdmin(id);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':slug')
  @ApiOperation({ summary: 'Get one active trainer by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.trainersService.findBySlug(slug);
  }

  @Roles('admin')
  @Audit('trainer.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a trainer (admin only)' })
  @ApiResponse({ status: 201, description: 'Trainer created' })
  async create(@Body() dto: CreateTrainerDto) {
    return this.trainersService.create(dto);
  }

  @Roles('admin')
  @Audit('trainer.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a trainer (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.trainersService.update(id, dto);
  }

  @Roles('admin')
  @Audit('trainer.deactivate')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a trainer (admin only) — never hard-deletes' })
  async deactivate(@Param('id') id: string) {
    return this.trainersService.deactivate(id);
  }
}
