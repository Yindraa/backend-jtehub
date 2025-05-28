import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsIn,
  IsArray,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomCode: string;

  @IsString()
  @IsOptional()
  roomName?: string; // Added roomName as it's usually needed

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  @IsIn(['aktif', 'kosong', 'pemeliharaan'])
  status?: 'aktif' | 'kosong' | 'pemeliharaan' = 'kosong'; // Default to 'kosong'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];
}