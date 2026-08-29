import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RequestUser } from '@/auth/interfaces/request-user.interface';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Feature('shop')
@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's wishlist" })
  async get(@CurrentUser() user: RequestUser) {
    return this.wishlistService.get(user.userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  async add(@CurrentUser() user: RequestUser, @Param('productId') productId: string) {
    return this.wishlistService.add(user.userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  async remove(@CurrentUser() user: RequestUser, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.userId, productId);
  }
}
