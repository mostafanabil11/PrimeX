import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, BulkAdjustStockDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Products')
@Feature('shop')
@UseInterceptors(AuditInterceptor)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiOperation({
    summary: 'Browse products (filter by category id, size, sort, search query q, page, limit)',
  })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('best-sellers')
  @ApiOperation({ summary: 'Get best-seller products (for homepage)' })
  async findBestSellers() {
    return this.productsService.findBestSellers();
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('colors')
  @ApiOperation({ summary: 'Distinct colors in use across active products, for filter UI' })
  async listColors() {
    const data = await this.productsService.listDistinctColors();
    return { success: true, message: 'Colors retrieved', data };
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete suggestions for the search box' })
  async suggest(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      return { success: true, message: 'Suggestions retrieved', data: [] };
    }
    return this.productsService.suggest(q.trim());
  }

  // Registered ahead of the public GET :slug route below — a static segment
  // like "admin" would otherwise be swallowed as a slug value.
  @Roles('admin')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Browse all products including inactive ones (admin only)' })
  async findAllAdmin(@Query() query: ProductQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  @Roles('admin')
  @Get('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one product by id, active or not (admin only)' })
  async findOneAdmin(@Param('id') id: string) {
    return this.productsService.findByIdAdmin(id);
  }

  @Roles('admin')
  @Audit('product.stock_adjust')
  @Post('stock/bulk-adjust')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually adjust stock for one or more product/size lines (admin only)',
  })
  async bulkAdjustStock(@CurrentUser() user: RequestUser, @Body() dto: BulkAdjustStockDto) {
    // Falls back to the id: email is nullable now that members can be created
    // at the front desk, and a stock movement still needs someone's name on
    // it. An admin always has an address, so this is belt-and-braces.
    const results = await this.productsService.bulkAdjustStock(
      dto.lines,
      user.email ?? user.userId
    );
    return { success: true, message: 'Stock adjustment processed', data: results };
  }

  @Roles('admin')
  @Audit('product.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product (admin only)' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Roles('admin')
  @Audit('product.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Roles('admin')
  @Audit('product.deactivate')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate a product — soft delete, admin only (PATCH isActive:true to restore)',
  })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Roles('admin')
  @Get(':id/stock-movements')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a product's stock movement history (admin only)" })
  async getStockMovements(@Param('id') id: string) {
    return this.productsService.getStockMovements(id);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':slug')
  @ApiOperation({ summary: 'Get a product by slug (includes sibling colorways via styleGroup)' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
