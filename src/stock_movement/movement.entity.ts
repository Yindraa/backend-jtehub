import { 
    IsUUID, 
    IsEnum, 
    IsInt, 
    IsPositive 
  } from 'class-validator';
  
  // CREATE DTO
  export class CreateStockMovementDto {  
    @IsUUID()
    batch_id: string;
  
    @IsEnum(['IN', 'OUT'])
    movement_type: 'IN' | 'OUT';
  
    @IsInt()
    @IsPositive()
    quantity: number;
  }
  
  export class StockMovementDto {
    id: string;
    batch_id: string;
    movement_type: 'IN' | 'OUT';
    quantity: number;
    movement_date: Date;
    user_id: string;
    product_id: string;
    // The joined product details
    products: {
      name: string;
    }
  }
  // RESPONSE DTO
  export class StockMovementWithProductDto {
    id: string;
    batch_id: string;
    movement_type: 'IN' | 'OUT';
    quantity: number;
    movement_date: Date;
    user_id: string;
    product_id: string;
    expired_date: Date;
    // The joined product details
    products: {
      name: string;
    }
  }
  
 