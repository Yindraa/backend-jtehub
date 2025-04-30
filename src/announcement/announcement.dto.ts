import { IsString, IsNotEmpty } from 'class-validator';

export class StockAnnouncementDto {
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  type: 'low_stock' | 'expired' | 'expiring_soon';

  @IsString()
  @IsNotEmpty()
  product_name: string;

  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  created_at: string;
}

export class StockAnnouncementsResponseDto {
  message: string;
  data: StockAnnouncementDto[];
}
