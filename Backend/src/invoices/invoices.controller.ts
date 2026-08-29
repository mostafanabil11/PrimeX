import { Controller, Get, Post, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

// Gated per-handler rather than on the class: the member-facing routes belong
// to member accounts, while the admin table and taking cash at the desk belong
// to membership tracking. A single class-level gate took the whole front desk
// offline along with the member area, which is not the same capability.
@ApiTags('Invoices')
@UseInterceptors(AuditInterceptor)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  // Every member route is scoped to the caller rather than taking an id and
  // checking ownership afterwards. An invoice carries a name, an email and an
  // amount, so the query itself is the access control.
  @Feature('memberAccounts')
  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Your payment history' })
  async findMine(@CurrentUser() user: RequestUser) {
    return this.invoicesService.findAllForMember(user.userId);
  }

  // Ahead of /:invoiceNumber so "admin" is not read as one.
  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Get('admin')
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiOperation({ summary: 'All invoices, with a paid total' })
  async findAllAdmin(
    @Query('status') status?: string,
    @Query('member') member?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.invoicesService.findAllAdmin({
      status,
      member,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Feature('memberAccounts')
  @Get(':invoiceNumber')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One of your invoices, for printing as a receipt' })
  async findOne(@Param('invoiceNumber') invoiceNumber: string, @CurrentUser() user: RequestUser) {
    return this.invoicesService.findOneForMember(invoiceNumber, user.userId);
  }

  // Staff, not just admin: taking cash at the desk is front-desk work. The
  // audit decorator records who did it, and receivedBy stores it on the
  // invoice itself.
  @Feature('membershipTracking')
  @Roles('admin', 'staff')
  @Audit('invoice.cash_payment')
  @Post(':id/record-cash-payment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a cash payment taken at the front desk' })
  async recordCash(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.invoicesService.recordCashPayment(id, user.userId);
  }
}
