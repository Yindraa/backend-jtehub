// src/schedule/dto/create-academic-schedule.dto.ts
import { IsString, IsNotEmpty, IsInt, Min, Max, Matches } from 'class-validator';

// Enum SemesterType (ganjil/genap) akan digunakan secara internal oleh service,
// tidak lagi sebagai input langsung jika dideduksi dari semesterOrdinal.
// Namun, bisa berguna untuk DTO respons.

export class CreateAcademicScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama mata kuliah tidak boleh kosong.'})
  courseName: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode mata kuliah tidak boleh kosong.'})
  courseCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode ruangan tidak boleh kosong.'})
  roomCode: string;

  @IsString()
  @IsNotEmpty()
  lecturerName: string;

  @IsInt()
  @Min(1, { message: 'Nomor urut semester minimal 1.' })
  @Max(14, { message: 'Nomor urut semester tidak boleh lebih dari 14.' }) // Sesuaikan jika perlu
  semesterOrdinal: number; // e.g., 1, 2, 3, ...

  @IsInt()
  @Min(0, { message: 'Hari dalam seminggu harus antara 0 (Minggu) dan 6 (Sabtu).' })
  @Max(6, { message: 'Hari dalam seminggu harus antara 0 (Minggu) dan 6 (Sabtu).' })
  dayOfWeek: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Waktu mulai harus dalam format HH:MM.' })
  startTime: string; // Format "HH:MM"

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Waktu selesai harus dalam format HH:MM.' })
  endTime: string; // Format "HH:MM"
}

export enum SemesterTypeResponse { // Bisa gunakan enum yang sama jika namanya konsisten
  GANJIL = 'ganjil',
  GENAP = 'genap',
}
export class AcademicScheduleResponseDto {
  id: string;
  lecturerName: string | null;
  semesterOrdinal: number;
  semesterType: SemesterTypeResponse;
  dayOfWeek: number;
  startTime: string; // HH:MM:SS from DB
  endTime: string;   // HH:MM:SS from DB
  createdAt: Date;
  updatedAt: Date;

  // Joined fields (ensure these are present)
  courseId: string | null; // Foreign key
  courseName: string | null;
  courseCode: string | null; // Added for completeness

  roomId: string | null; // Foreign key
  roomCode: string | null;
  roomName: string | null;
}