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

export class CurrentRoomStatusDto {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: 'aktif' | 'kosong' | 'pemeliharaan';
  capacity: number;
  rating: number;
  courseName: string | null;
  lecturerName: string | null;
  scheduleStartTime: Date | null;
  scheduleEndTime: Date | null;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  roomName?: string; // Making roomName updatable as well, common requirement

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  @IsIn(['aktif', 'kosong', 'pemeliharaan'])
  status?: 'aktif' | 'kosong' | 'pemeliharaan';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];
}