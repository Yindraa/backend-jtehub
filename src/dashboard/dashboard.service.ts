// dashboard.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import {
  BasicCountDto,
  StockMovementGroupedDto,
  ProductTypeDistributionDto,
  DashboardResponseDto,
} from './dashboard.dto';

@Injectable()
export class DashboardService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Returns an object containing all dashboard metrics:
   *  - total products
   *  - low-stock count
   *  - stock movements grouped by month/week/day
   *  - product type distribution
   */
  async getDashboardData(userId: string, lowStockThreshold = 5): Promise<DashboardResponseDto> {
    // 1) total products
    const totalProducts = await this.getTotalProducts(userId);

    // 2) low stock count
    const lowStockCount = await this.getLowStockCount(userId, lowStockThreshold);

    // 3) stock movements: monthly, weekly, daily
    const monthlyMovements = await this.getStockMovementsGrouped(userId, 'month');
    const weeklyMovements = await this.getStockMovementsGrouped(userId, 'week');
    const dailyMovements = await this.getStockMovementsGrouped(userId, 'day');
    const last7DaysMovements = await this.getLast7DaysMovements(userId);

    // 4) product type distribution
    const productTypeDistribution = await this.getProductTypeDistribution(userId);

    // Optionally, compute percentages for the pie chart distribution
    const totalAllTypes = productTypeDistribution.reduce(
      (acc, cur) => acc + Number(cur.total_quantity),
      0,
    );
    const distributionWithPercentages = productTypeDistribution.map((item) => ({
      ...item,
      percentage: totalAllTypes > 0 ? (Number(item.total_quantity) / totalAllTypes) * 100 : 0,
    }));

    return {
      totalProducts,
      lowStockCount,
    //   monthlyMovements,
    //   weeklyMovements,
    //   dailyMovements,
      last7DaysMovements,
      productTypeDistribution: distributionWithPercentages,
    };
  }

  private async getTotalProducts(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_total_products', { p_user_id: userId });
    if (error) {
      throw new InternalServerErrorException(`Error getting total products: ${error.message}`);
    }
    return Number(data);
  }

  private async getLowStockCount(userId: string, threshold: number): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_low_stock_count', { p_user_id: userId, p_threshold: threshold });
    if (error) {
      throw new InternalServerErrorException(`Error getting low stock count: ${error.message}`);
    }
    return Number(data);
  }

  private async getStockMovementsGrouped(
    userId: string,
    grouping: 'month' | 'week' | 'day',
  ): Promise<StockMovementGroupedDto[]> {
    const { data, error } = await this.supabase
      .rpc('get_stock_movements_grouped', { p_user_id: userId, p_grouping: grouping });

    if (error) {
      throw new InternalServerErrorException(
        `Error getting stock movements (grouped by ${grouping}): ${error.message}`,
      );
    }
    return data || [];
  }

  private async getProductTypeDistribution(
    userId: string,
  ): Promise<ProductTypeDistributionDto[]> {
    const { data, error } = await this.supabase
      .rpc('get_product_type_distribution', { p_user_id: userId });

    if (error) {
      throw new InternalServerErrorException(
        `Error getting product type distribution: ${error.message}`,
      );
    }
    return data || [];
  }

  async getLast7DaysMovements(userId: string): Promise<StockMovementGroupedDto[]> {
    const { data, error } = await this.supabase
      .rpc('get_stock_movements_last7days', { p_user_id: userId });

    if (error) {
      throw new InternalServerErrorException(
        `Error getting last 7 days movements: ${error.message}`,
      );
    }
    return data || [];
  }
}
