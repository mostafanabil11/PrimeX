import { Controller, Get, Post, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PersonalTrainingService } from './personal-training.service';
import { ReservePtDto, UpdatePtRequestDto, AddPtNoteDto, PtRequestQueryDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

@ApiTags('Personal Training')
@UseInterceptors(AuditInterceptor)
@Controller('personal-training')
export class PersonalTrainingController {
  constructor(private ptService: PersonalTrainingService) {}

  // Five a minute per IP, matching the enquiry endpoint. Public, unauthenticated
  // and it creates a member account, which is the exact shape worth abusing —
  // the honeypot in the DTO catches the naive bots and this caps the rest. Low
  // enough to be useless as an amplifier, high enough that two people signing up
  // on the same gym wifi are both fine.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reserve')
  @ApiOperation({ summary: 'Reserve personal training with a named coach' })
  @ApiResponse({ status: 201, description: 'Request received' })
  async reserve(@Body() dto: ReservePtDto) {
    return this.ptService.reserve(dto);
  }

  @Roles('admin', 'staff')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List personal training requests' })
  async findAll(@Query() query: PtRequestQueryDto) {
    return this.ptService.findAll(query);
  }

  @Roles('admin', 'staff')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one personal training request' })
  async findOne(@Param('id') id: string) {
    return this.ptService.findOne(id);
  }

  @Roles('admin', 'staff')
  @Audit('pt.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move a request along the pipeline' })
  async update(@Param('id') id: string, @Body() dto: UpdatePtRequestDto) {
    return this.ptService.update(id, dto);
  }

  @Roles('admin', 'staff')
  @Audit('pt.note')
  @Post(':id/notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a note to a request' })
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddPtNoteDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.ptService.addNote(id, dto, user.userId);
  }
}
