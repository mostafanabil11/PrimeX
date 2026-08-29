import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BackInStockService } from './back-in-stock.service';
import { CreateBackInStockRequestDto } from './dto/create-back-in-stock-request.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Back In Stock')
@Feature('shop')
@Controller('back-in-stock')
export class BackInStockController {
  constructor(private backInStockService: BackInStockService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':productId')
  @ApiOperation({ summary: 'Ask to be emailed when a sold-out size is back' })
  async create(@Param('productId') productId: string, @Body() dto: CreateBackInStockRequestDto) {
    return this.backInStockService.create(productId, dto.size, dto.email);
  }
}
