// src/reservations/dto/create-reservation.dto.ts
import { IsString, IsNotEmpty, IsDateString, Matches } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  roomCode: string;

  @IsString()
  @IsNotEmpty()
  purpose: string; // "tujuan penggunaan"

  @IsDateString({}, { message: 'Reservation date must be a valid date in YYYY-MM-DD format.' })
  reservationDate: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Start time must be in HH:MM format.' })
  startTime: string; // HH:MM

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'End time must be in HH:MM format.' })
  endTime: string; // HH:MM
}

// src/reservations/dto/reservation.response.dto.ts
export enum ReservationStatus {
  MENUNGGU = 'menunggu',
  DISETUJUI = 'disetujui',
  DITOLAK = 'ditolak',
}

export class ReservationUserInfoDto {
  id: string;
  fullName: string | null;
  username?: string | null; // Optional
}

export class ReservationResponseDto {
  id: string;
  roomCode: string;
  roomName: string | null;
  requestingUser: ReservationUserInfoDto;
  purpose: string;
  reservationDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: ReservationStatus;
  requestedAt: Date; // Full timestamp
  requestedAtRelative?: string; // e.g., "3 hours ago"

  // Admin specific fields
  processedByAdmin?: ReservationUserInfoDto | null;
  processedAt?: Date | null;
  processedAtRelative?: string;
  adminNotes?: string | null;
}

// src/reservations/dto/update-reservation-status.dto.ts
import { IsEnum, IsOptional} from 'class-validator';

export class UpdateReservationStatusDto {
  @IsEnum(ReservationStatus, {
    message: `Status must be one of: ${Object.values(ReservationStatus).join(', ')}`,
  })
  status: ReservationStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}