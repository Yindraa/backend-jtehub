import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards, Query } from '@nestjs/common';
import { CreateStockBatchDto, StockBatch, CreateStockMovementDto, UpdateStockBatchDto } from './batch.entity';
import { StockBatchService } from './batch.service';
import { StockMovementService } from '../stock_movement/movement.service';
import { JwtGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/user.decorator';

@Controller('batches')
@UseGuards(JwtGuard)
export class StockBatchController {
  constructor(
    private stockBatchService: StockBatchService,
    private stockMovementService: StockMovementService
  ) {}

  @Post()
  createBatch(
    @Body() dto: CreateStockBatchDto, 
    @GetUser() user: { id: string }
  ) {
    return this.stockBatchService.createBatch(dto, user.id);
  }

  @Get()
    async findAll(
      @GetUser() user: {id: string},
      @Query('start_date') startDate?: string,
      @Query('end_date') endDate?: string,
      @Query('sort') sort: 'asc' | 'desc' = 'desc'
    ): Promise<StockBatch[]> {
      return this.stockBatchService.findAll(user.id, startDate, endDate, sort);
    }

  @Post(':id/adjust')
  adjustStock(
    @Param('id') batchId: string,
    @Body() dto: CreateStockMovementDto,
    @GetUser() user: any
  ) {
    return this.stockBatchService.adjustStock(batchId, dto, user.id);
  }

  @Get(':id/movements')
  getMovements(@Param('id') batchId: string, @Query() query: { page?: number, limit?: number }) {
    return this.stockMovementService.getBatchMovements(
      batchId,
      query.page,
      query.limit
    );
  }

  @Get(':id')
  getBatch(@Param('id') batchId: string) {
    return this.stockBatchService.getBatch(batchId);
  }

   @Put(':id')
    update(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() updateDto: UpdateStockBatchDto,
      @GetUser() user: {id: string},
    ): Promise<StockBatch> {
      return this.stockBatchService.update(id, updateDto, user.id);
    }
  
    @Delete(':id')
    remove(
      @Param('id', ParseUUIDPipe) id: string,
      @GetUser() user: {id: string},
    ): Promise<void> {
      return this.stockBatchService.remove(id, user.id);
    }
  }
  
  

