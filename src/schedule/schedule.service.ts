import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CreateScheduleDto, ScheduleDetailsDto, UpdateScheduleDto } from './schedule.dto';
import { Schedule, Course } from '../entities'; // Assuming you have a Schedule entity defined

@Injectable()
export class ScheduleService {
    private supabase: SupabaseClient;

    constructor() {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;
  
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and Key must be provided');
      }
  
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async create(createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    const {
      courseName,
      courseCode,
      lecturer,
      scheduleStartTime,
      scheduleEndTime,
      roomCode,
      semester,
    } = createScheduleDto;

    // 1. Check if the room exists
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !roomData) {
      throw new NotFoundException(`Room with code ${roomCode} not found.`);
    }

    const roomId = roomData.id; // Get the actual room ID


    // 2. Find or create the course
    let course: Course;
    const { data: existingCourse, error: courseFindError } = await this.supabase
      .from('courses')
      .select('*')
      .eq('course_code', courseCode)
      .single();

    if (existingCourse) {
      course = existingCourse;
    } else {
      const { data: newCourse, error: courseCreateError } =
        await this.supabase
          .from('courses')
          .insert([
            {
              course_name: courseName,
              course_code: courseCode,
            },
          ])
          .select()
          .single(); // Use .select().single() to get the created row

      if (courseCreateError) {
        console.error('Error creating course:', courseCreateError);
        throw new Error('Could not create the course.');
      }
      course = newCourse;
    }

    // 3. Create the schedule
    const { data: newSchedule, error: scheduleError } = await this.supabase
      .from('schedules')
      .insert([
        {
          course_id: course.id,
          room_id: roomId,
          lecturer_name: lecturer,
          schedule_start_time: scheduleStartTime,
          schedule_end_time: scheduleEndTime,
          semester: semester,
        },
      ])
      .select()
      .single();

    if (scheduleError) {
        // You might want to check for specific errors, like overlapping schedules, here
        console.error('Error creating schedule:', scheduleError);
        throw new Error('Could not create the schedule.');
    }

    return newSchedule;
  }

  async findAllWithDetails(): Promise<ScheduleDetailsDto[]> {
    const { data, error } = await this.supabase
      .from('schedules')
      .select(`
        *, 
        courses (
          course_name
        ),
        rooms (
          room_code,
          room_name
        )
      `)
      .order('schedule_start_time', { ascending: true }); // Optional: order the results

    if (error) {
      console.error('Error fetching schedules with details:', error);
      throw new Error('Could not fetch schedules.');
    }

    if (!data) {
      return [];
    }

    return data.map(schedule => {
      // Supabase returns related data as nested objects (e.g., schedule.courses, schedule.rooms)
      // These can be null if the foreign key is null or the related record doesn't exist.
      return {
        id: schedule.id,
        lecturer_name: schedule.lecturer_name,
        schedule_start_time: new Date(schedule.schedule_start_time),
        schedule_end_time: new Date(schedule.schedule_end_time),
        semester: schedule.semester,
        created_at: new Date(schedule.created_at),
        updated_at: new Date(schedule.updated_at),
        course_id: schedule.course_id,
        room_id: schedule.room_id,
        course_name: schedule.courses?.course_name || null,
        room_code: schedule.rooms?.room_code || null,
        room_name: schedule.rooms?.room_name || null,
      };
    });
  }

  // async create(dto: CreateScheduleDto): Promise<Schedule> {
  //   const { data, error } = await this.supabase.rpc(
  //     'create_schedule_with_course',
  //     {
  //       p_course_name: dto.course_name,
  //       p_course_code: dto.course_code,
  //       p_lecturer: dto.lecturer,
  //       p_schedule_time: dto.time,
  //       p_room_code: dto.room_code,
  //       p_semester: dto.semester
  //     }
  //   ).select().single();

  //   if (error) {
  //     throw new InternalServerErrorException(`Failed to create schedule: ${error.message}`);
  //   }
  //   return data;
  // }

  

  // Update and delete methods would need similar adjustments
  // ... (rest of the methods)
}