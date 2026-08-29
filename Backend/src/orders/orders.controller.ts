import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { OptionalAuth } from '@/auth/decorators/optional-auth.decorator';
import { Public } from '@/auth/decorators/public.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Roles } from '@/common/decorators/roles.decorator';
import { Audit } from '@/common/decorators/audit.decorator';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Feature('shop')
@UseInterceptors(AuditInterceptor)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // Open to guests. Optional (not skipped) auth, so a signed-in customer is
  // still recognised and gets the order attached to their account with their
  // saved addresses available — buying without an account is a choice the
  // customer makes, not a different endpoint.
  @OptionalAuth()
  @Post('checkout')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Place an order (cash on delivery or card) as a guest or signed-in customer',
  })
  async checkout(@CurrentUser() user: RequestUser | null, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user?.userId ?? null, dto);
  }

  // Order-number + email pair, for a guest coming back later without the
  // one-time token from checkout. Throttled hard because it is the one
  // unauthenticated way to reach an order.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('lookup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Look up an order by its number and the email it was placed with' })
  async lookup(@Body() dto: LookupOrderDto) {
    return this.ordersService.findOneForViewer(dto.orderNumber, { email: dto.email });
  }

  @Get()
  @ApiOperation({ summary: "List the current user's orders" })
  async findAll(@CurrentUser() user: RequestUser) {
    return this.ordersService.findAllForUser(user.userId);
  }

  // Registered ahead of the customer-scoped GET :orderNumber route below —
  // otherwise "admin" would be swallowed as an order number param.
  @Roles('admin')
  @Get('admin')
  @ApiOperation({
    summary: 'List every order, filterable by payment/fulfillment status (admin only)',
  })
  async findAllAdmin(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Roles('admin')
  @Get('admin/:orderNumber')
  @ApiOperation({ summary: 'Get any order by its order number, regardless of owner (admin only)' })
  async findOneAdmin(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findOneAdmin(orderNumber);
  }

  // Polled by the checkout page while the customer is in the payment frame.
  // The browser redirect can be lost (closed tab, blocked popup), so the UI
  // never relies on it alone to learn the outcome.
  @OptionalAuth()
  @Get(':orderNumber/payment-status')
  @ApiOperation({ summary: 'Poll the payment status of a card order' })
  async paymentStatus(
    @CurrentUser() user: RequestUser | null,
    @Param('orderNumber') orderNumber: string,
    @Headers('x-order-token') orderToken?: string
  ) {
    return this.ordersService.getPaymentStatus(
      { userId: user?.userId ?? null, guestAccessToken: orderToken ?? null },
      orderNumber
    );
  }

  @OptionalAuth()
  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get one order by its order number' })
  async findOne(
    @CurrentUser() user: RequestUser | null,
    @Param('orderNumber') orderNumber: string,
    @Headers('x-order-token') orderToken?: string
  ) {
    return this.ordersService.findOneForViewer(orderNumber, {
      userId: user?.userId ?? null,
      guestAccessToken: orderToken ?? null,
    });
  }

  @OptionalAuth()
  @Post(':orderNumber/cancel')
  @ApiOperation({ summary: 'Cancel one of your own orders while it is still unpaid and unshipped' })
  async cancel(
    @CurrentUser() user: RequestUser | null,
    @Param('orderNumber') orderNumber: string,
    @Headers('x-order-token') orderToken?: string
  ) {
    return this.ordersService.cancelOrder(
      { userId: user?.userId ?? null, guestAccessToken: orderToken ?? null },
      orderNumber
    );
  }

  @Roles('admin')
  @Audit('order.status_update')
  @Patch(':orderNumber/status')
  @ApiOperation({ summary: 'Update fulfillment/payment status of any order (admin only)' })
  async updateStatus(@Param('orderNumber') orderNumber: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(orderNumber, dto);
  }
}
