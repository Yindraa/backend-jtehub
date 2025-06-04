// src/schedule/academic-schedule.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
    import { CreateAcademicScheduleDto } from './academic-schedule.dto';
import { AcademicScheduleResponseDto, SemesterTypeResponse } from './academic-schedule.dto';

enum SemesterTypeForDb {
  GANJIL = 'ganjil',
  GENAP = 'genap',
}

interface CourseData { id: string; course_name: string; course_code: string; }
interface RoomData { id: string; room_name: string; room_code: string; }

@Injectable()
export class AcademicScheduleService {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private getSemesterType(semesterOrdinal: number): SemesterTypeForDb {
    return semesterOrdinal % 2 !== 0 ? SemesterTypeForDb.GANJIL : SemesterTypeForDb.GENAP;
  }

  async createAcademicSchedule(dto: CreateAcademicScheduleDto): Promise<AcademicScheduleResponseDto> {
    const {
      courseName,
      courseCode,
      roomCode,
      lecturerName,
      semesterOrdinal,
      dayOfWeek,
      startTime, // "HH:MM"
      endTime,   // "HH:MM"
    } = dto;

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time.');
    }
    const formattedStartTime = `${startTime}:00`; // Konversi ke HH:MM:SS
    const formattedEndTime = `${endTime}:00`;

    // 1. Cari Room berdasarkan roomCode
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('id, room_name, room_code')
      .eq('room_code', roomCode)
      .maybeSingle();
    if (roomError) throw new Error('Failed to validate room code.');
    if (!roomData) throw new NotFoundException(`Room with code ${roomCode} not found.`);
    const actualRoomId = (roomData as RoomData).id;

    // 2. Cari atau Buat Course berdasarkan courseCode
    let course: CourseData;
    const { data: existingCourse, error: courseFindError } = await this.supabase
      .from('courses')
      .select('id, course_name, course_code')
      .eq('course_code', courseCode)
      .maybeSingle();
    if (courseFindError) throw new Error('Failed to validate course code.');
    if (existingCourse) {
      course = existingCourse as CourseData;
    } else {
      const { data: newCourse, error: courseCreateError } = await this.supabase
        .from('courses')
        .insert({ course_name: courseName, course_code: courseCode })
        .select('id, course_name, course_code')
        .single();
      if (courseCreateError) throw new Error('Could not create the course.');
      course = newCourse as CourseData;
    }
    const actualCourseId = course.id;

    // 3. Deduksi tipe semester
    const semesterType = this.getSemesterType(semesterOrdinal);

    // 4. Cek Aturan Jadwal Bentrok (untuk rule yang sama persis atau tumpang tindih waktu)
    //    Constraint UNIQUE di DB akan menangani duplikasi persis (room, day, start, end, semester_ordinal).
    //    Kita perlu cek tumpang tindih waktu secara manual.
    const { count: conflictCount, error: conflictError } = await this.supabase
      .from('academic_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', actualRoomId)
      .eq('day_of_week', dayOfWeek)
      .eq('semester_ordinal', semesterOrdinal) // Cek untuk semester ordinal yang sama
      // Cek tumpang tindih waktu: (StartA < EndB) AND (EndA > StartB)
      .lt('start_time', formattedEndTime)
      .gt('end_time', formattedStartTime);
      
    if (conflictError) {
        console.error('Error checking for schedule rule conflicts:', conflictError);
        throw new Error('Failed to check for schedule rule conflicts.');
    }

    if (conflictCount !== null && conflictCount > 0) {
      throw new ConflictException(
        `Academic schedule conflict detected: Room ${roomCode} on day ${dayOfWeek} for semester ${semesterOrdinal} already has an overlapping schedule between ${startTime}-${endTime}.`
      );
    }

    // 5. Buat Jadwal Akademis Baru
    const { data: newScheduleData, error: insertError } = await this.supabase
      .from('academic_schedules')
      .insert({
        course_id: actualCourseId,
        room_id: actualRoomId,
        lecturer_name: lecturerName,
        semester_ordinal: semesterOrdinal,
        semester_type: semesterType, // Simpan tipe semester yang dideduksi
        day_of_week: dayOfWeek,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        // effective_start_date dan effective_end_date tidak lagi disimpan di sini
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating academic schedule:', insertError);
      throw new Error(`Could not create academic schedule: ${insertError.message}`);
    }

    return {
        id: newScheduleData.id,
        courseId: newScheduleData.course_id,
        roomId: newScheduleData.room_id,
        lecturerName: newScheduleData.lecturer_name,
        semesterOrdinal: newScheduleData.semester_ordinal,
        semesterType: newScheduleData.semester_type as SemesterTypeResponse,
        dayOfWeek: newScheduleData.day_of_week,
        startTime: newScheduleData.start_time,
        endTime: newScheduleData.end_time,
        createdAt: new Date(newScheduleData.created_at),
        updatedAt: new Date(newScheduleData.updated_at),
        courseName: course.course_name,
        courseCode: course.course_code,
        roomCode: (roomData as RoomData).room_code,
        roomName: (roomData as RoomData).room_name,
        // effectiveStartDate dan effectiveEndDate tidak ada di response DTO ini
    };
  }

  // async findAllWithDetails(): Promise<AcademicScheduleResponseDto[]> {
  //   const { data, error } = await this.supabase
  //     .from('academic_schedules')
  //     .select(`
  //       id,
  //       lecturer_name,
  //       semester_ordinal,
  //       semester_type,
  //       day_of_week,
  //       start_time,
  //       end_time,
  //       created_at,
  //       updated_at,
  //       course_id,
  //       room_id,
  //       courses ( 
  //         course_name,
  //         course_code 
  //       ),
  //       rooms (   
  //         room_code,
  //         room_name 
  //       )
  //     `)
  //     .order('semester_ordinal', { ascending: true })
  //     .order('day_of_week', { ascending: true })
  //     .order('start_time', { ascending: true });

  //   if (error) {
  //     console.error('Error fetching academic schedules with details:', JSON.stringify(error, null, 2));
  //     throw new Error('Could not fetch academic schedules.');
  //   }

  //   if (!data) {
  //     return [];
  //   }

  //   return data.map(schedule => {
  //     // Corrected casting:
  //     // TypeScript thinks schedule.courses/rooms might be an array due to general typings.
  //     // We know from Supabase's behavior with this select on a to-one relation,
  //     // it will be a single object or null. We use 'as any' to bypass the stricter
  //     // array-to-object type check and then cast to our expected object shape.
  //     const courseData = schedule.courses as any as { course_name: string | null; course_code: string | null; } | null;
  //     const roomData = schedule.rooms as any as { room_code: string | null; room_name: string | null; } | null;

  //     return {
  //       id: schedule.id,
  //       lecturerName: schedule.lecturer_name,
  //       semesterOrdinal: schedule.semester_ordinal,
  //       semesterType: schedule.semester_type as SemesterTypeResponse,
  //       dayOfWeek: schedule.day_of_week,
  //       startTime: schedule.start_time,
  //       endTime: schedule.end_time,
  //       createdAt: new Date(schedule.created_at),
  //       updatedAt: new Date(schedule.updated_at),
  //       courseId: schedule.course_id,
  //       roomId: schedule.room_id,
  //       courseName: courseData?.course_name || null,
  //       courseCode: courseData?.course_code || null,
  //       roomCode: roomData?.room_code || null,
  //       roomName: roomData?.room_name || null,
  //     };
  //   });
  // }

  // Metode findAll, findOne, update, delete untuk academic_schedules
  // Perlu diingat: saat mengambil jadwal untuk ditampilkan (misalnya, untuk minggu ini),
  // Anda perlu logika untuk "mengaktifkan" aturan academic_schedule ini dengan
  // menghitung tanggal efektif aktual berdasarkan tahun dan semester saat ini.
}