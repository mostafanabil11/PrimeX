import { Controller, Get, Post, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ClassesService } from './classes.service';
import { WEEKDAYS } from '@/branches/schemas/branch.schema';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');
const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm');

const createRuleSchema = z.object({
  classTypeId: OBJECT_ID,
  branchId: OBJECT_ID,
  trainerId: OBJECT_ID.nullish(),
  weekday: z.enum(WEEKDAYS),
  startTime: TIME,
  durationMinutes: z.number().int().min(5).max(300).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().trim().max(60).nullish(),
  womenOnly: z.boolean().optional(),
  effectiveFrom: z.iso.date(),
  effectiveUntil: z.iso.date().nullish(),
});
class CreateRuleDto extends createZodDto(createRuleSchema) {}

const updateSessionSchema = z.object({
  trainer: OBJECT_ID.nullish(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().trim().max(60).nullish(),
  womenOnly: z.boolean().optional(),
  startsAt: z.iso.datetime().optional(),
});
class UpdateSessionDto extends createZodDto(updateSessionSchema) {}

const cancelSessionSchema = z.object({
  reason: z.string().trim().max(300).nullish(),
});
class CancelSessionDto extends createZodDto(cancelSessionSchema) {}

@ApiTags('Classes')
@Feature('classBooking')
@UseInterceptors(AuditInterceptor)
@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  // The timetable. Public: the schedule is a sales tool as much as a member
  // service, and hiding it behind a login costs joins.
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('schedule')
  @ApiQuery({ name: 'from', required: false, description: 'Local date, YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'branch', required: false })
  @ApiQuery({ name: 'classType', required: false })
  @ApiQuery({ name: 'trainer', required: false })
  @ApiOperation({ summary: 'The class timetable for a date range' })
  async schedule(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branch') branch?: string,
    @Query('classType') classType?: string,
    @Query('trainer') trainer?: string
  ) {
    return this.classesService.findSessions({ from, to, branch, classType, trainer });
  }

  // Registered ahead of sessions/:id so "rules" is not read as an id.
  @Roles('admin', 'staff')
  @Get('rules')
  @ApiBearerAuth()
  @ApiQuery({ name: 'branch', required: false })
  @ApiOperation({ summary: 'The recurring slots behind the timetable' })
  async findRules(@Query('branch') branch?: string) {
    return this.classesService.findRules(branch);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('sessions/:id')
  @ApiOperation({ summary: 'One class in the timetable' })
  async findSession(@Param('id') id: string) {
    return this.classesService.findSession(id);
  }

  @Roles('admin', 'staff')
  @Audit('schedule.rule.create')
  @Post('rules')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a recurring slot and fill the timetable' })
  async createRule(@Body() dto: CreateRuleDto) {
    return this.classesService.createRule(dto);
  }

  @Roles('admin', 'staff')
  @Audit('schedule.rule.stop')
  @Post('rules/:id/stop')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop a recurring slot and clear its future sessions' })
  async stopRule(@Param('id') id: string) {
    return this.classesService.deactivateRule(id);
  }

  @Roles('admin', 'staff')
  @Audit('schedule.session.update')
  @Patch('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change one occurrence without touching the series' })
  async updateSession(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.classesService.updateSession(id, dto);
  }

  @Roles('admin', 'staff')
  @Audit('schedule.session.cancel')
  @Post('sessions/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel one class and refund everyone booked' })
  async cancelSession(@Param('id') id: string, @Body() dto: CancelSessionDto) {
    return this.classesService.cancelSession(id, dto.reason ?? null);
  }
}
