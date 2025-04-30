import { IsString, IsNotEmpty, IsInt, IsPositive, IsDateString, Length, IsEnum, IsOptional} from 'class-validator';

export class StockBatch {
    id: string;
    product_id: string;
    batch_number: string;
    expired_date: Date;
    quantity: number;
    created_at: Date;
    updated_at: Date;
  }

export class StockBatchWithProductDto {
  id: string;
  product_id: string;
  batch_number: string;
  expired_date: Date;
  quantity: number;
  created_at: Date;
  updated_at: Date;
  product_name: string;
  product_type: string;
}
  
  export class CreateStockBatchDto {
  
    product_id: string;

    // @IsString()
    // @Length(3,20)
    // batch_number: string;
  
    @IsDateString()
    expired_date: string;
  
    @IsInt()
    @IsPositive()
    quantity: number;
  }
  
  export class UpdateStockBatchDto {
    @IsInt()
    @IsPositive()
    @IsOptional()
    quantity?: number;

    @IsDateString()
    @IsOptional()
    expired_date?: string;
  }

  export class CreateStockMovementDto {  
      @IsEnum(['IN', 'OUT'])
      movement_type: 'IN' | 'OUT';
    
      @IsInt()
      @IsPositive()
      quantity: number;
    }


