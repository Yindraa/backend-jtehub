import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards, Query, Req } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockItemDto, DailyPriceIncreasePerProductResponseDto, MarketPriceComparisonResponseDto, ProductDashboardResponseDto, StockItem, UpdateStockItemDto, WeeklyPriceIncreasePerProductResponseDto } from './stock.entity';
import { JwtGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/user.decorator';

@Controller('stock')
@UseGuards(JwtGuard)//for all routes
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  create(
    @Body() createDto: CreateStockItemDto,
    @GetUser() user: { id: string },
  ): Promise<StockItem> {
    return this.stockService.create(createDto, user.id);
  }

  @Get()
  async findAll(
    @GetUser() user: {id: string},
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('sort') sort: 'asc' | 'desc' = 'desc'
  ): Promise<StockItem[]> {
    return this.stockService.findAll(user.id, startDate, endDate, sort);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: {id: string},
  ): Promise<StockItem> {
    return this.stockService.findOne(id, user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStockItemDto,
    @GetUser() user: {id: string},
  ): Promise<StockItem> {
    return this.stockService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: {id: string},
  ): Promise<void> {
    return this.stockService.remove(id, user.id);
  }

  @Get('market')
  getMarketPriceComparison(
  @GetUser() user: { id: string },
  ): Promise<MarketPriceComparisonResponseDto> {
    return this.stockService.getMarketPriceComparison(user.id);
  }
}

@Controller('market')
@UseGuards(JwtGuard)//for all routes
export class MarketController {
  constructor(private readonly stockService: StockService) {}

  @Get('')
  getMarketPriceComparison(
  @GetUser() user: { id: string },
  ): Promise<MarketPriceComparisonResponseDto> {
    return this.stockService.getMarketPriceComparison(user.id);
  }

  @Get('weekly-product')
  async getWeeklyPriceIncreaseGroupedByProduct(@Req() req): Promise<WeeklyPriceIncreasePerProductResponseDto> {
    // Assuming req.user contains the authenticated user's details.
    const userId = req.user?.id || 'default_user_id';
    return this.stockService.getWeeklyPriceIncreaseGroupedByProduct(userId);
  }

  /**
   * GET /dashboard/daily-product
   * Returns the daily price increase per product.
   */
  @Get('daily-product')
  async getDailyPriceIncreaseGroupedByProduct(@Req() req): Promise<DailyPriceIncreasePerProductResponseDto> {
    const userId = req.user?.id || 'default_user_id';
    return this.stockService.getDailyPriceIncreaseGroupedByProduct(userId);
  }

  @Get('dashboard/:productId')
  async getProductDashboard(
    @Param('productId') productId: string,
    @Req() req
  ): Promise<ProductDashboardResponseDto> {
    // Retrieve authenticated user's id (or use a default for testing)
    const userId = req.user?.id || 'default_user_id';
    return this.stockService.getProductDashboard(userId, productId);
  }
}

