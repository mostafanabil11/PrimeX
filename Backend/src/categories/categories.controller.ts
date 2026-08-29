import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, ReorderCategoriesDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Categories')
@Feature('shop')
@UseInterceptors(AuditInterceptor)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get the full category tree (for nav/mega-menu)' })
  async getTree() {
    return this.categoriesService.findTree();
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get('featured')
  @ApiOperation({ summary: 'Get categories featured on the homepage' })
  async getFeatured() {
    return this.categoriesService.findFeatured();
  }

  // Registered ahead of the public :parentSlug/:childSlug and :slug routes
  // below — otherwise "admin/tree" would be swallowed as slug params.
  @Roles('admin')
  @Get('admin/tree')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the full category tree including inactive categories (admin only)',
  })
  async getTreeAdmin() {
    return this.categoriesService.findTreeAdmin();
  }

  @Roles('admin')
  @Audit('category.create')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category (admin only)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles('admin')
  @Audit('category.reorder')
  @Patch('reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update display order (admin only)' })
  async reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(dto);
  }

  @Roles('admin')
  @Audit('category.update')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Roles('admin')
  @Audit('category.delete')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (admin only)' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':parentSlug/:childSlug')
  @ApiOperation({ summary: 'Get a subcategory by parent + child slug' })
  async getChildBySlug(
    @Param('parentSlug') parentSlug: string,
    @Param('childSlug') childSlug: string
  ) {
    return this.categoriesService.findChildBySlug(parentSlug, childSlug);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Get(':slug')
  @ApiOperation({ summary: 'Get a top-level category by slug, with its children' })
  async getBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findTopLevelBySlug(slug);
  }
}
