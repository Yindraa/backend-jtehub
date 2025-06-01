// src/dashboard/dto/dashboard.response.dto.ts

export class RoomUsageDto {
  roomCode: string;
  roomName: string | null;
  totalDurationSeconds: number; // Atau format durasi lain jika diinginkan
  totalDurationFormatted?: string; // e.g., "10 jam 30 menit"
}

export class CommentDistributionDto {
  positiveComments: number;
  negativeComments: number;
  totalComments: number;
}

export class DashboardResponseDto {
  totalRooms: number;
  newRoomsThisMonth: number;
  activeRooms: number;
  emptyRooms: number;
  positiveCommentCount: number; // Hanya jumlah komentar positif
  commentDistribution: CommentDistributionDto; // Distribusi positif & negatif
  topUsedRooms: RoomUsageDto[];
}

// src/schedules/dto/schedule-details.dto.ts

// src/dashboard/dto/dashboard-analytics.response.dto.ts

export class HourlyRoomAvailabilityDto {
  hour: number; // 0-23 representing the hour of the day
  averageEmptyRooms: number; // Rata-rata jumlah ruangan kosong pada jam tersebut
}

export class RoomRatingSatisfactionDto {
  rating: number; // Bintang 1, 2, 3, 4, 5
  count: number;  // Jumlah komentar dengan rating tersebut
}

export class DashboardAnalyticsResponseDto {
  hourlyRoomAvailability: HourlyRoomAvailabilityDto[];
  roomRatingSatisfaction: RoomRatingSatisfactionDto[];
}

export interface Schedule {
  room_id: string;
  schedule_start_time: string; // ISO String
  schedule_end_time: string;   // ISO String
}

export interface Reservation {
  room_id: string;
  reservation_date: string; // YYYY-MM-DD
  start_time: string;       // HH:MM:SS
  end_time: string;         // HH:MM:SS
}