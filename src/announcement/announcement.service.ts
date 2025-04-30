import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { StockAnnouncementsResponseDto, StockAnnouncementDto } from './announcement.dto';

@Injectable()
export class AnnouncementService {
  private supabase: SupabaseClient;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getAnnouncements(userId: string): Promise<StockAnnouncementsResponseDto> {
    const { data, error } = await this.supabase
      .from('stock_announcements')
      .select('id, message, type, product_name, product_id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return { message: 'Announcements retrieved successfully', data };
  }

  async checkAndCreateAnnouncements(userId: string): Promise<void> {
    // Get all stock records for the user.
    const { data: stocks, error: stocksError } = await this.supabase
      .from('stock')
      .select('id, name, quantity')
      .eq('user_id', userId);

    if (stocksError) {
      throw new InternalServerErrorException(stocksError.message);
    }

    // Iterate over each stock (product) record.
    for (const stock of stocks) {
      // Create low stock announcement if quantity < 3
      if (stock.quantity < 3) {
        // Check if an active announcement for low stock already exists
        const { data: existingLow, error: existingLowError } = await this.supabase
          .from('stock_announcements')
          .select('id')
          .eq('product_id', stock.id)
          .eq('type', 'low_stock')
          .eq('is_active', true);

        if (existingLowError) {
          throw new InternalServerErrorException(existingLowError.message);
        }

        if (!existingLow || existingLow.length === 0) {
          // Insert new low_stock announcement.
          const lowStockMessage = `The stock for product ${stock.name} is low (Quantity: ${stock.quantity}).`;
          const { error: insertLowError } = await this.supabase
            .from('stock_announcements')
            .insert({
              product_id: stock.id,
              product_name: stock.name,
              user_id: userId,
              type: 'low_stock',
              message: lowStockMessage,
            });
          
          if (insertLowError) {
            console.error(`Failed to create low stock announcement for ${stock.name}: ${insertLowError.message}`);
          }
        }
      }

      // Check for expired product in stock_batches
      // Query all batches for this stock.
      const { data: batches, error: batchesError } = await this.supabase
        .from('stock_batches')
        .select('id, expired_date')
        .eq('product_id', stock.id);

      if (batchesError) {
        throw new InternalServerErrorException(batchesError.message);
      }

      // If any batch is expired (expired_date < now()), create an announcement.
      const now = new Date();
      const hasExpiredBatch = batches.some((batch: { expired_date: string }) => {
        return new Date(batch.expired_date) < now;
      });

      if (hasExpiredBatch) {
        // Check if an active "expired" announcement already exists for this product.
        const { data: existingExpired, error: existingExpiredError } = await this.supabase
          .from('stock_announcements')
          .select('id')
          .eq('product_id', stock.id)
          .eq('type', 'expired')
          .eq('is_active', true);

        if (existingExpiredError) {
          throw new InternalServerErrorException(existingExpiredError.message);
        }

        if (!existingExpired || existingExpired.length === 0) {
          const expiredMessage = `The product ${stock.name} has expired batches. Please check expiration dates.`;
          const { error: insertExpiredError } = await this.supabase
            .from('stock_announcements')
            .insert({
              product_id: stock.id,
              product_name: stock.name,
              user_id: userId,
              type: 'expired',
              message: expiredMessage,
            });
          
          if (insertExpiredError) {
            console.error(`Failed to create expired announcement for ${stock.name}: ${insertExpiredError.message}`);
          }
        }
      }
    }
  }

  async dismissAnnouncement(announcementId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('stock_announcements')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', announcementId)
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
