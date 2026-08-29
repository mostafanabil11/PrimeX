import { Controller, Get, Post, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

const freezeSchema = z.object({
  from: z.iso.date('Choose a date for the freeze to start'),
  days: z.number().int().min(1).max(365),
  reason: z.string().trim().max(300).nullish(),
});
class FreezeDto extends createZodDto(freezeSchema) {}

const cancelSchema = z.object({
  reason: z.string().trim().max(500).nullish(),
});
class CancelDto extends createZodDto(cancelSchema) {}

// Gated per-handler: the two mine/* routes are the member area, everything
// else is staff work at the desk. See the same split on InvoicesController.
@ApiTags('Memberships')
@UseInterceptors(AuditInterceptor)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * The membership the member can use right now, or null.
   *
   * Returns null rather than 404: "you have no membership" is a normal state
   * for a signed-in account, and making the member area handle an error for
   * it would be wrong.
   */
  @Feature('memberAccounts')
  @Get('mine/current')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Your active membership, if you have one' })
  async findMineCurrent(@CurrentUser() user: RequestUser) {
    const subscription = await this.subscriptionsService.findActiveForMember(user.userId);
    return {
      success: true,
      message: subscription ? 'Membership retrieved' : 'No active membership',
      data: subscription,
    };
  }

  @Feature('memberAccounts')
  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Every membership you have held' })
  async findMine(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.findAllForMember(user.userId);
  }

  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Get('member/:memberId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Every membership held by one member' })
  async findForMember(@Param('memberId') memberId: string) {
    return this.subscriptionsService.findAllForMember(memberId);
  }

  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One membership in full' })
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  // Staff, not just admin: freezing is a front-desk conversation, and the
  // approver is recorded on the freeze itself.
  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Audit('subscription.freeze')
  @Post(':id/freeze')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Freeze a membership and push its end date out' })
  async freeze(@Param('id') id: string, @Body() dto: FreezeDto, @CurrentUser() user: RequestUser) {
    return this.subscriptionsService.freeze(id, {
      from: new Date(dto.from),
      days: dto.days,
      reason: dto.reason ?? null,
      approvedBy: user.userId,
    });
  }

  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Audit('subscription.unfreeze')
  @Post(':id/unfreeze')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End a freeze early, returning the unused days' })
  async unfreeze(@Param('id') id: string) {
    return this.subscriptionsService.unfreeze(id);
  }

  // Staff too, by the owner's decision: at a single gym the front desk is the
  // person having the cancellation conversation, and routing it through the
  // owner just delays it. This still ends something a member paid for, so the
  // audit entry below is the record of who did it.
  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Audit('subscription.cancel')
  @Post(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a membership' })
  async cancel(@Param('id') id: string, @Body() dto: CancelDto) {
    return this.subscriptionsService.cancel(id, dto.reason ?? null);
  }
}
