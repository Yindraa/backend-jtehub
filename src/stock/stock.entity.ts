import { IsString, IsNotEmpty, IsInt, IsPositive, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class StockItem {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    product_type: string;
    // expired_date?: Date;
    created_at: Date;
    updated_at: Date;
  }
  
export class CreateStockItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // @IsOptional()
  // @IsString()
  // description?: string = 'description';

  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsString()
  @IsNotEmpty()
  product_type: string;

  @IsDateString()
  @IsOptional()
  expired_date?: Date;
}

export class UpdateStockItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  product_type?: string;

  // @IsDateString()
  // @IsOptional()
  // expired_date?: Date;
}

export class CompetitorPriceDto {
  user_id: string;
  username: string;
  price: number;
}

export class MarketPriceComparisonItemDto {
  name: string;
  user_price: number;
  competitorPrices: CompetitorPriceDto[];
}

export class MarketPriceComparisonResponseDto {
  message: string;
  data: MarketPriceComparisonItemDto[];
}

// Daily price increase per product
export interface DailyPriceIncreasePerProductItemDto {
  product: string;
  percentage: number;
}

export interface DailyPriceIncreasePerProductResponseDto {
  message: string;
  data: DailyPriceIncreasePerProductItemDto[];
}

// Weekly price increase per product (daily break-down for each product)
export interface WeeklyPriceIncreaseItemDto {
  day: string;         // e.g., "Monday"
  percentage: number;  // e.g., 2.0 for a 2% change
}

export interface WeeklyPriceIncreasePerProductItemDto {
  product: string;
  dailyIncreases: WeeklyPriceIncreaseItemDto[];
}

export interface WeeklyPriceIncreasePerProductResponseDto {
  message: string;
  data: WeeklyPriceIncreasePerProductItemDto[];
}

export class ProductDashboardResponseDto {
  message: string;
  data: {
    marketComparison: MarketPriceComparisonItemDto;
    weeklyIncrease: {
      dailyIncreases: { day: string; percentage: number }[];
    };
    dailyIncrease: {
      percentage: number | null; // null if not available
    };
  };
}
