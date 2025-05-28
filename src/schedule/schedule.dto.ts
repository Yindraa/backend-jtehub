import {  
  IsISO8601, 
  IsOptional, 
  Matches 
} from 'class-validator';
import { Type } from 'class-transformer';

  
  // export class CreateScheduleDto {
  //   @IsString()
  //   @IsNotEmpty()
  //   course_name: string;
  
  //   @IsString()
  //   @IsNotEmpty()
  //   @Matches(/^[A-Z0-9]{3,10}$/, {
  //     message: 'Course code must be 3-10 uppercase letters/numbers'
  //   })
  //   course_code: string;
  
  //   @IsString()
  //   @IsNotEmpty()
  //   lecturer: string;
  
  //   @Type(() => Date)
  //   time: Date;
  
  //   @IsString()
  //   @IsNotEmpty()
  //   room_code: string;
  
  //   @IsString()
  //   @IsNotEmpty()
  //   semester: string;
  // }

  import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  courseName: string;

  @IsString()
  @IsNotEmpty()
  courseCode: string;

  @IsString()
  @IsNotEmpty()
  lecturer: string;

  @IsDateString()
  @IsNotEmpty()
  scheduleStartTime: string; // Use ISO 8601 format (e.g., "2025-05-28T09:00:00.000Z")

  @IsDateString()
  @IsNotEmpty()
  scheduleEndTime: string; // Use ISO 8601 format

  @IsString() // Changed from IsUUID
  @IsNotEmpty()
  roomCode: string; // Changed from roomId

  @IsInt()
  @Min(1)
  semester: number;
}
  
  export class UpdateScheduleDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    course_name?: string;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Z0-9]{3,10}$/)
    course_code?: string;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    lecturer?: string;
  
    @IsOptional()
    @Type(() => Date)
    time?: Date;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    room_code?: string;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    semester?: string;
  }