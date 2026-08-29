import { Controller, Get, Post, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { BookingsService } from './bookings.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

const bookSchema = z.object({
  sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid class id'),
});
class BookDto extends createZodDto(bookSchema) {}

const attendanceSchema = z.object({ attended: z.boolean() });
class AttendanceDto extends createZodDto(attendanceSchema) {}

@ApiTags('Bookings')
@Feature('classBooking')
@UseInterceptors(AuditInterceptor)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  // Tighter than the default. Booking is a write that decrements capacity and
  // spends a credit, and a loop here would be expensive for everyone.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Audit('booking.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book onto a class' })
  async book(@Body() dto: BookDto, @CurrentUser() user: RequestUser) {
    return this.bookingsService.book(user.userId, dto.sessionId);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiQuery({ name: 'scope', required: false, enum: ['upcoming', 'past'] })
  @ApiOperation({ summary: 'Your bookings' })
  async findMine(@CurrentUser() user: RequestUser, @Query('scope') scope?: string) {
    return this.bookingsService.findMine(user.userId, scope === 'past' ? 'past' : 'upcoming');
  }

  @Audit('booking.cancel')
  @Post(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel one of your bookings' })
  async cancel(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.bookingsService.cancel(user.userId, id);
  }

  @Roles('admin', 'staff')
  @Get('member/:memberId')
  @ApiBearerAuth()
  @ApiQuery({ name: 'scope', required: false, enum: ['upcoming', 'past'] })
  @ApiOperation({ summary: "One member's bookings, for the admin member page" })
  async findForMember(@Param('memberId') memberId: string, @Query('scope') scope?: string) {
    return this.bookingsService.findMine(memberId, scope === 'past' ? 'past' : 'upcoming');
  }

  // Not scoped to the session's assigned trainer: a colleague covering a
  // class, or checking in on one before their own, needs the same roster a
  // desk staffer would see. Single gym, small trusted trainer team — the
  // audit interceptor still records who looked.
  @Roles('admin', 'staff', 'trainer')
  @Get('session/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The roster for one class' })
  async roster(@Param('sessionId') sessionId: string) {
    return this.bookingsService.findForSession(sessionId);
  }

  @Roles('admin', 'staff', 'trainer')
  @Audit('booking.attendance')
  @Post(':id/attendance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a booking attended or a no-show' })
  async attendance(@Param('id') id: string, @Body() dto: AttendanceDto) {
    return this.bookingsService.markAttendance(id, dto.attended);
  }
}
