import { Injectable, NotFoundException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { SupabaseClient, createClient} from '@supabase/supabase-js';
import { CreateStockBatchDto, StockBatch, StockBatchWithProductDto } from './batch.entity';
import { CreateStockMovementDto, UpdateStockBatchDto } from './batch.entity';

@Injectable()
export class StockBatchService {
  private supabase: SupabaseClient;
  
    constructor() {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;
  
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and Key must be provided');
      }
  
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async createBatch(dto: CreateStockBatchDto, userId:string): Promise<StockBatch> {
      try {
        // Debug: Log the check query
        // console.log('Checking for existing batch with:', {
        //   product_id: dto.product_id,
        //   batch_number: dto.batch_number
        // });
    
        const { data: existingBatch, error: checkError } = await this.supabase
          .from('stock_batches')
          .select('*')
          // .eq('product_id', dto.product_id)
          // .eq('batch_number', dto.batch_number)
          // .maybeSingle();
    
        // console.log('Check result:', { existingBatch, checkError });
    
        // if (existingBatch) {
        //   console.log('Conflict detected:', existingBatch);
        //   throw new ConflictException('Batch already exists');
        // }
    
        const { data: newBatch, error: insertError} = await this.supabase
          .from('stock_batches')
          .insert([{ ...dto, user_id: userId }])
          .select()
          .single();

        if (insertError) {
          console.error('Insert batch error:', insertError);
          throw new InternalServerErrorException('Failed to create batch');
        }

        return newBatch;
      } catch (error) {
        console.error('Create batch error:', error);
        throw error;
      }
    }
  
    async findAll(
      userId: string,
      startDate?: string,
      endDate?: string,
      sort: 'asc' | 'desc' = 'desc'
    ): Promise<StockBatchWithProductDto[]> {
      let query = this.supabase
        .from('stock_batches')
        .select(`
          *,
          stock!inner(
            name,
            product_type
          )
        `)
        .eq('user_id', userId);
    
      // Date filter
      if (startDate && endDate) {
        query = query.gte('created_at', startDate)
                     .lte('created_at', endDate);
      }
    
      // Sorting
      query = query.order('created_at', { ascending: sort === 'asc' });
    
      const { data, error } = await query;
    
      if (error) throw new InternalServerErrorException(error.message);
    
      // Map the nested products data to flat structure
      return data.map(({ stock, ...batch }) => ({
        ...batch,  // Keep all batch properties except 'stock'
        product_name: stock?.name || 'N/A',
        product_type: stock?.product_type || 'N/A'
      }));
    }
  
  async adjustStock(batchId: string, dto: CreateStockMovementDto, userId: string) {
    return this.supabase.rpc('handle_stock_adjustment', {
      p_batch_id: batchId,
      p_quantity: dto.quantity,
      p_type: dto.movement_type,
      p_user_id: userId
    });
  }

  async getBatch(batchId: string): Promise<StockBatch> {
    const { data, error } = await this.supabase
      .from('stock_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) throw new NotFoundException('Batch not found');
    return data;
  }

  async update(id: string, updateDto: UpdateStockBatchDto, userId: string): Promise<StockBatch> {
      const { data, error } = await this.supabase
        .from('stock_batches')
        .update({ ...updateDto, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId) // Critical security check
        .select()
        .single();
  
      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException(`Stock batch not found. Details: ${error.message}`);
        }
        throw new Error(`Supabase error [${error.code}]: ${error.message}`);
      }
      return data;
    }
  
    async remove(id: string, userId:string): Promise<void> {
      const { error } = await this.supabase
        .from('stock_batches')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Critical security check
  
      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException(`Stock batch not found. Details: ${error.message}`);
        }
        throw new Error(`Supabase error [${error.code}]: ${error.message}`);
      }
    }
  
}