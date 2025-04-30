import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards, Query } from '@nestjs/common';
import { StockMovementService } from '../stock_movement/movement.service';
import { CreateStockMovementDto, StockMovementDto } from './movement.entity';
import { JwtGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/user.decorator';

@Controller('movement')
@UseGuards(JwtGuard)
export class StockMovementController {
  constructor(
    private stockMovementService: StockMovementService
  ) {}
  @Post('')
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @GetUser() user: any
  ) {
    return this.stockMovementService.createStockMovement(dto, user.id);
  }

  @Get()
      async findAll(
        @GetUser() user: {id: string},
        @Query('start_date') startDate?: string,
        @Query('end_date') endDate?: string,
        @Query('sort') sort: 'asc' | 'desc' = 'desc'
      ): Promise<StockMovementDto[]> {
        return this.stockMovementService.getMovements(user.id, startDate, endDate, sort
        );
      }
  

  @Get(':id')
  getMovements(@Param('id') batchId: string, @Query() query: { page?: number, limit?: number }) {
    return this.stockMovementService.getBatchMovements(
      batchId,
      query.page,
      query.limit
    );
  }
}