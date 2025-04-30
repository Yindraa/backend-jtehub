import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CreateStockMovementDto, StockMovementDto, StockMovementWithProductDto } from './movement.entity';

@Injectable()
export class StockMovementService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getBatchMovements(batchId: string, page = 1, limit = 10) {
    const { data, error } = await this.supabase
      .from('stock_movements')
      .select(`
        *,
        stock_batches(
          product_id,
          stock(
            name
          )
        )
      `)
      .eq('batch_id', batchId)
      .order('movement_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new NotFoundException('No movements found');
    return data;
  }
  async getMovements(
    userId: string,
    startDate?: string,
    endDate?: string,
    sort: 'asc' | 'desc' = 'desc'
  ): Promise<StockMovementWithProductDto[]> {
    let query = this.supabase
      .from('stock_movements')
      .select(`
        *,
        stock_batches(
          product_id,
          expired_date,
          stock(
            name
          )
        )
      `)
      .eq('user_id', userId)
      // .order('movement_date', { ascending: false })
    
      if (startDate && endDate) {
        query = query.gte('movement_date', startDate)
                     .lte('movement_date', endDate);
      }

      query = query.order('movement_date', { ascending: sort === 'asc' });
          
      const { data, error } = await query;
          
      if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async createStockMovement(dto: CreateStockMovementDto, userId: string) {
    return this.supabase.rpc('handle_stock_adjustment', {
      p_batch_id: dto.batch_id,
      p_quantity: dto.quantity,
      p_type: dto.movement_type,
      p_user_id: userId
    });
  }
}