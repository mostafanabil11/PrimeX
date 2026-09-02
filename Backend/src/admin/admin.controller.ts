import { Controller, Get, Post, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { Feature } from '@/common/decorators/feature.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

// Staff at class level, by the owner's decision: at a single gym the front
// desk runs the whole operation, so the member list and the audit trail are
// theirs to use. Roles are still distinct — every payment records receivedBy
// and every mutation is audited, which is what makes one account per person
// worth insisting on.
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin', 'staff')
@UseInterceptors(AuditInterceptor)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard/gym')
  @ApiOperation({ summary: 'Gym KPIs: members, revenue, class fill rate, open leads' })
  async getGymDashboard() {
    return this.adminService.getGymDashboard();
  }

  @Feature('membershipTracking')
  @Get('dashboard/funnel')
  @ApiOperation({ summary: 'Website conversion funnel and unsettled reservations' })
  async getFunnelInsights(@Query('days') days?: string) {
    // Clamped: the click collection expires at ~400 days, so a longer window
    // would quietly report a shrinking numerator against a full denominator.
    const parsed = Number(days);
    const window = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 365) : 30;
    return this.adminService.getFunnelInsights(window);
  }

  @Get('customers')
  @ApiOperation({ summary: 'List members, searchable by name, email or member number' })
  async listCustomers(@Query() query: AdminCustomerQueryDto) {
    return this.adminService.listCustomers(query);
  }

  // After /customers so the literal segment matches first, ahead of :id.
  @Get('customers/:id')
  @ApiOperation({ summary: 'One member profile, for the admin member page' })
  async getCustomer(@Param('id') id: string) {
    return this.adminService.getCustomer(id);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Who changed what, newest first' })
  async listAuditLog(@Query() query: AdminAuditQueryDto) {
    return this.adminService.listAuditLog(query);
  }

  // --- Staff accounts: admin only ---
  //
  // These four override the class-level rule back to admin. Staff can run the
  // whole gym, but they cannot create colleagues or revoke each other — that
  // is the owner's job, and it is the one place the two roles still differ in
  // kind rather than degree.

  @Roles('admin')
  @Get('staff')
  @ApiOperation({ summary: 'Front-desk accounts and whether they are active' })
  async listStaff() {
    return this.adminService.listStaff();
  }

  @Roles('admin')
  @Audit('staff.create')
  @Post('staff')
  @ApiOperation({ summary: 'Create a front-desk account; returns the password once' })
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaff(dto);
  }

  @Roles('admin')
  @Audit('staff.reset_password')
  @Post('staff/:id/reset-password')
  @ApiOperation({ summary: 'Issue a new password and sign the account out everywhere' })
  async resetStaffPassword(@Param('id') id: string) {
    return this.adminService.resetStaffPassword(id);
  }

  @Roles('admin')
  @Audit('staff.set_active')
  @Patch('staff/:id')
  @ApiOperation({ summary: 'Switch a front-desk account on or off' })
  async setStaffActive(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.adminService.setStaffActive(id, dto);
  }
}
