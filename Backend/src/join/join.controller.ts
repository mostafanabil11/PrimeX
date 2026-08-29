import { Controller, Post, Get, Body, Query, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JoinService } from './join.service';
import {
  StartJoinDto,
  PreviewJoinDto,
  ReserveJoinDto,
  RecordMembershipDto,
  PARQ_QUESTIONS,
  AGREEMENT_VERSION,
} from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

// No class-level gate. `preview` is what the reservation form quotes from and
// must stay reachable while online card checkout is off; `start` is the card
// funnel itself and carries the gate on its own.
@ApiTags('Join')
@UseInterceptors(AuditInterceptor)
@Controller('join')
export class JoinController {
  constructor(private joinService: JoinService) {}

  // The funnel renders these rather than hardcoding them, so revising a
  // question or the agreement version is a backend change only.
  @Public()
  @Get('questionnaire')
  @ApiOperation({ summary: 'The PAR-Q questions and the current agreement version' })
  getQuestionnaire() {
    return {
      success: true,
      message: 'Questionnaire retrieved',
      data: { questions: PARQ_QUESTIONS, agreementVersion: AGREEMENT_VERSION },
    };
  }

  // Public so the pricing on the review step works before someone has an
  // account — a quote is not a commitment, and making people register to see
  // the total is exactly the friction that loses joins.
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('preview')
  @ApiOperation({ summary: 'Quote a plan, optionally with a promo code' })
  async preview(@Body() dto: PreviewJoinDto, @CurrentUser() user?: RequestUser) {
    return this.joinService.preview(dto, user?.userId ?? null);
  }

  // Tighter than the default: this creates a subscription, an invoice and a
  // Paymob session, so a loop here is expensive on our side and on theirs.
  @Feature('membershipSales')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Audit('join.start')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a membership' })
  async start(@Body() dto: StartJoinDto, @CurrentUser() user: RequestUser) {
    return this.joinService.start(user.userId, dto);
  }

  /**
   * Reserve a membership from the website, to be paid at the gym.
   *
   * Public and unauthenticated on purpose: requiring an account before someone
   * can tell us they want to join is the friction this whole flow exists to
   * remove. The record it creates is what makes the WhatsApp conversation that
   * follows a settlement rather than a data-entry exercise.
   *
   * Five a minute matches the enquiry form. This writes two documents, so it
   * is more expensive than an enquiry rather than less. No @Audit — that
   * decorator records staff mutations, and this is a member acting for
   * themselves.
   */
  @Public()
  @Feature('membershipTracking')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reserve')
  @ApiOperation({ summary: 'Reserve a membership, to be paid offline' })
  async reserve(@Body() dto: ReserveJoinDto) {
    return this.joinService.reserve(dto);
  }

  // Exact match on the normalized phone, so the front-desk form can tell staff
  // whether they are about to create a member or reuse one. Its own route
  // rather than /admin/customers because that controller is admin-only and
  // searches names with a regex, which is the wrong tool here.
  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Get('member-lookup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find a member by phone number' })
  async memberLookup(@Query('phone') phone: string) {
    return this.joinService.memberLookup(phone ?? '');
  }

  // Staff, not just admin: signing someone up at the desk is front-desk work,
  // exactly like taking their cash. Audited because it creates a membership
  // and can move money in the same call.
  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Audit('membership.record')
  @Post('record')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a membership taken at the front desk' })
  async record(@Body() dto: RecordMembershipDto, @CurrentUser() user: RequestUser) {
    return this.joinService.recordMembership(dto, user.userId);
  }
}
