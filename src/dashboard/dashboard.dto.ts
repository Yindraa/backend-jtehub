// dashboard.dto.ts

// For total products and low-stock count
export class BasicCountDto {
    count: number;
  }
  
  // For stock movements aggregated by period
  export class StockMovementGroupedDto {
    period: string;       // e.g. '2025-04-01' for daily grouping
    total_in: number;
    total_out: number;
  }
  
  // For product-type distribution
  export class ProductTypeDistributionDto {
    product_type: string;
    total_quantity: number;
    percentage?: number;  // We'll calculate in the service if desired
  }
  
  // For the complete dashboard response (all in one go)
  export class DashboardResponseDto {
    totalProducts: number;
    lowStockCount: number;
  
    // grouped stock movements
    // monthlyMovements: StockMovementGroupedDto[];
    // weeklyMovements: StockMovementGroupedDto[];
    // dailyMovements: StockMovementGroupedDto[];
    last7DaysMovements: StockMovementGroupedDto[];
  
    // distribution by product type
    productTypeDistribution: ProductTypeDistributionDto[];
  }
  