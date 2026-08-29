import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Addresses')
@ApiBearerAuth()
@Feature('shop')
@Controller('addresses')
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Add a saved address' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's saved addresses" })
  async findAll(@CurrentUser() user: RequestUser) {
    return this.addressesService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one saved address' })
  async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.addressesService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto
  ) {
    return this.addressesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a saved address' })
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.addressesService.remove(user.userId, id);
  }
}
