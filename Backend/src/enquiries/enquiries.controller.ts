import { Controller, Get, Post, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto, UpdateEnquiryDto, AddEnquiryNoteDto, EnquiryQueryDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Enquiries')
@UseInterceptors(AuditInterceptor)
@Controller('enquiries')
export class EnquiriesController {
  constructor(private enquiriesService: EnquiriesService) {}

  // Five a minute per IP. Public, unauthenticated and it sends mail, which is
  // the exact shape spammers look for — the honeypot in the DTO catches the
  // naive ones and this caps the rest. Low enough to be useless as an
  // amplifier, high enough that a family signing up together is fine.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Submit a contact message or free-trial request' })
  @ApiResponse({ status: 201, description: 'Enquiry received' })
  async create(@Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(dto);
  }

  @Roles('admin', 'staff')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List enquiries, filterable by type, status and branch' })
  async findAll(@Query() query: EnquiryQueryDto) {
    return this.enquiriesService.findAll(query);
  }

  @Roles('admin', 'staff')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one enquiry' })
  async findOne(@Param('id') id: string) {
    return this.enquiriesService.findOne(id);
  }

  @Roles('admin', 'staff')
  @Audit('enquiry.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update status, assignment or branch' })
  async update(@Param('id') id: string, @Body() dto: UpdateEnquiryDto) {
    return this.enquiriesService.update(id, dto);
  }

  @Roles('admin', 'staff')
  @Audit('enquiry.note')
  @Post(':id/notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a note to an enquiry' })
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddEnquiryNoteDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.enquiriesService.addNote(id, dto, user.userId);
  }
}
