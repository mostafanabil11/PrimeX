import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';

/**
 * Admin-only, deliberately.
 *
 * There is no public offers endpoint: the pricing page reads prices that
 * already have offers applied, from /plans. Publishing the raw offer records
 * as well would give the browser a second, differently-shaped copy of the
 * pricing rules to disagree with the server about.
 */
@ApiTags('Offers')
@UseInterceptors(AuditInterceptor)
@Controller('offers')
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Roles('admin', 'staff')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List every offer, live or not' })
  async findAll() {
    return this.offersService.findAllAdmin();
  }

  @Roles('admin', 'staff')
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one offer' })
  async findOne(@Param('id') id: string) {
    return this.offersService.findOneAdmin(id);
  }

  @Roles('admin', 'staff')
  @Audit('offer.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an offer (admin only)' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  async create(@Body() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @Roles('admin', 'staff')
  @Audit('offer.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an offer, including pausing it (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offersService.update(id, dto);
  }

  @Roles('admin', 'staff')
  @Audit('offer.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an offer (admin only)' })
  async remove(@Param('id') id: string) {
    return this.offersService.remove(id);
  }
}
