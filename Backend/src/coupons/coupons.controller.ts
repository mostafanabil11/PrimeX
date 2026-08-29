import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto';
import { CartService } from '@/cart/cart.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { OptionalAuth } from '@/auth/decorators/optional-auth.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Coupons')
@ApiBearerAuth()
// Coupons carry a 'membership' scope in their schema, but the only caller
// today is OrdersService — see coupons.service.ts. Gate on shop until a
// membership-side redemption path actually exists to use it.
@Feature('shop')
@UseInterceptors(AuditInterceptor)
@Controller('coupons')
export class CouponsController {
  constructor(
    private couponsService: CouponsService,
    private cartService: CartService
  ) {}

  @OptionalAuth()
  @Post('validate')
  @ApiOperation({ summary: 'Preview a coupon against the cart (works for guests too)' })
  async validate(@CurrentUser() user: RequestUser | null, @Body() dto: ValidateCouponDto) {
    // Signed-in callers are always priced against their real server cart;
    // only a guest may describe their own basket, and even then every line is
    // re-resolved against live product data by the cart service.
    const { data: cart } = user
      ? await this.cartService.getCart(user.userId)
      : await this.cartService.validate(dto.items ?? []);

    const application = await this.couponsService.resolveCoupon(
      dto.code,
      user ? { userId: user.userId } : { userId: null, email: dto.email },
      cart
    );
    return {
      success: true,
      message: 'Coupon applied',
      data: {
        code: application.coupon.code,
        type: application.coupon.type,
        discountAmount: application.discountAmount,
        freeShipping: application.freeShipping,
      },
    };
  }

  @Roles('admin')
  @Audit('coupon.create')
  @Post()
  @ApiOperation({ summary: 'Create a coupon (admin only)' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Roles('admin')
  @Get()
  @ApiOperation({ summary: 'List all coupons (admin only)' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @Roles('admin')
  @Get(':id')
  @ApiOperation({ summary: 'Get one coupon (admin only)' })
  async findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Roles('admin')
  @Audit('coupon.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Roles('admin')
  @Audit('coupon.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon (admin only)' })
  async remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
