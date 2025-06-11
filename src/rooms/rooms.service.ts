import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CreateRoomDto } from './rooms.dto';
import { Room } from '../entities'; // Assuming you have a Room entity defined
import { CurrentRoomStatusDto, UpdateRoomDto, RoomScheduleDto } from './rooms.dto'; // Assuming you have a DTO for current room status
import { formatInTimeZone } from 'date-fns-tz';

@Injectable()
export class RoomsService {
    private supabase: SupabaseClient;

    constructor() {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;
  
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and Key must be provided');
      }
  
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const { roomCode, roomName, capacity, status, facilities } = createRoomDto;

    const { data: newRoom, error } = await this.supabase
      .from('rooms')
      .insert([
        {
          room_code: roomCode,
          room_name: roomName,
          capacity: capacity,
          status: status || 'kosong', // Use provided status or default
          facilities: facilities || [], // Use provided facilities or empty array
        },
      ])
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation (error code 23505 for PostgreSQL)
      if (error.code === '23505') {
          throw new ConflictException(`Room with code ${roomCode} already exists.`);
      }
      console.error('Error creating room:', error);
      throw new Error('Could not create the room.');
    }

    return newRoom;
  }

  // async findCurrentStatus(): Promise<CurrentRoomStatusDto[]> {
  //   const { data, error } = await this.supabase
  //     .rpc('get_current_room_status'); // Call the function

  //   if (error) {
  //     console.error('Error fetching current room status:', error);
  //     throw new Error('Could not fetch current room status.');
  //   }

  //   // Map the data to our DTO (optional but good practice for consistency)
  //   return data.map(item => ({
  //       roomId: item.room_id,
  //       roomCode: item.room_code,
  //       roomName: item.room_name,
  //       status: item.status,
  //       capacity: item.capacity,
  //       rating: item.rating,
  //       courseName: item.course_name,
  //       lecturerName: item.lecturer_name,
  //       scheduleStartTime: item.schedule_start_time,
  //       scheduleEndTime: item.schedule_end_time,
  //   }));
  // }

  async findCurrentStatus(): Promise<CurrentRoomStatusDto[]> {
    const { data, error } = await this.supabase
      .rpc('get_current_room_status');

    if (error) {
      console.error('Error fetching current room status:', JSON.stringify(error, null, 2));
      throw new Error('Could not fetch current room status.');
    }

    if (!data) {
        return [];
    }
    
    const manadoTimeZone = 'Asia/Makassar'; // WITA


    return data.map((item: any) => {
  const eventStartTimeWITA = item.event_start_time 
    ? formatInTimeZone(new Date(item.event_start_time), manadoTimeZone, "yyyy-MM-dd'T'HH:mm:ssXXX") 
    : null;
  const eventEndTimeWITA = item.event_end_time 
    ? formatInTimeZone(new Date(item.event_end_time), manadoTimeZone, "yyyy-MM-dd'T'HH:mm:ssXXX") 
    : null;

  return {
    roomId: item.room_id,
    roomCode: item.room_code,
    roomName: item.room_name,
    status: item.status,
    capacity: item.capacity,
    rating: item.rating !== null ? Number(item.rating) : null,
    eventName: item.event_name,
    personInCharge: item.person_in_charge,
    eventStartTime: eventStartTimeWITA, // String waktu Manado
    eventEndTime: eventEndTimeWITA,     // String waktu Manado
  };
  });


  // return data.map((item: any) => ({ // Gunakan 'any' atau buat interface yang lebih spesifik untuk hasil RPCAdd commentMore actions
  //     roomId: item.room_id,
  //     roomCode: item.room_code,
  //     roomName: item.room_name,
  //     status: item.status,
  //     capacity: item.capacity,
  //     rating: item.rating !== null ? Number(item.rating) : null, // NUMERIC bisa jadi string
  //     eventName: item.event_name,                             // Nama field baru
  //     personInCharge: item.person_in_charge,                  // Nama field baru
  //     eventStartTime: item.event_start_time ? new Date(item.event_start_time) : null, // Nama field baru
  //     eventEndTime: item.event_end_time ? new Date(item.event_end_time) : null,     // Nama field baru
  //   }));
  }

  async update(roomCode: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const updateData  = updateRoomDto;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      // Optionally, you could fetch and return the room without changes,
      // or throw a BadRequestException. For now, let's fetch and return.
      const { data: existingRoom, error: findError } = await this.supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();
      if (findError || !existingRoom) {
        throw new NotFoundException(`Room with code ${roomCode} not found.`);
      }
      return existingRoom;
    }

    const { data: updatedRoom, error } = await this.supabase
      .from('rooms')
      .update(updateData) // Pass only the fields to be updated
      .eq('room_code', roomCode) // Identify the room by its code
      .select()
      .single();

    if (error) {
      // Handle potential errors, e.g., if the room_code to update to already exists (if room_code was updatable)
      // For now, the main error would be if the room isn't found, which is handled by .single() if it returns null
      console.error('Error updating room:', error);
      throw new Error(`Could not update room with code ${roomCode}. Error: ${error.message}`);
    }

    if (!updatedRoom) {
      throw new NotFoundException(`Room with code ${roomCode} not found or no changes made.`);
    }

    return updatedRoom;
  }

  async findSchedulesByRoomCode(roomCode: string): Promise<RoomScheduleDto[]> {
    // 1. Find the room by its code to get its ID
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .select('id, room_name') // Also fetching room_name for context, optional
      .eq('room_code', roomCode)
      .single();

    if (roomError || !roomData) {
      throw new NotFoundException(`Room with code ${roomCode} not found.`);
    }
    const roomId = roomData.id;

    // 2. Fetch schedules for that room_id, joining with courses
    const { data: schedulesData, error: schedulesError } = await this.supabase
      .from('schedules')
      .select(`
        id,
        semester,
        lecturer_name,
        schedule_start_time,
        schedule_end_time,
        courses (
          course_code,
          course_name
        )
      `)
      .eq('room_id', roomId)
      .order('schedule_start_time', { ascending: true }); // Order by start time

    if (schedulesError) {
      console.error(`Error fetching schedules for room ${roomCode}:`, schedulesError);
      throw new Error(`Could not fetch schedules for room ${roomCode}.`);
    }

    if (!schedulesData) {
      return []; // No schedules found for this room
    }
    console.log('Raw schedulesData from Supabase:', JSON.stringify(schedulesData, null, 2)); // Log the whole array

    // 3. Map to DTO
    // 3. Map to DTO - CORRECTED LOGIC
    // 3. Map to DTO - CORRECTED LOGIC based on raw data
    // 3. Map to DTO
    return schedulesData.map(schedule => {
      let courseDetails: { courseCode: string | null; courseName: string | null; };

      // 'schedule.courses' is an OBJECT according to your previous raw log
      let courseObject: { course_code: string | null; course_name: string | null; } | null = null;

      if (Array.isArray(schedule.courses) && schedule.courses.length > 0) {
        courseObject = schedule.courses[0];
      } else if (schedule.courses && typeof schedule.courses === 'object') {
        // If it's an array, take the first element; otherwise, use as is
        courseObject = Array.isArray(schedule.courses) ? schedule.courses[0] : schedule.courses;
      }

      if (courseObject) {
        courseDetails = {
          courseCode: courseObject.course_code,
          courseName: courseObject.course_name,
        };
      } else {
        courseDetails = { courseCode: null, courseName: null };
      }

      // Ensure the returned object strictly matches RoomScheduleDto
      const resultItem: RoomScheduleDto = {
        scheduleId: schedule.id as string, // Cast if necessary, or ensure Supabase types are precise
        semester: schedule.semester as number,
        lecturerName: schedule.lecturer_name as (string | null),
        scheduleStartTime: new Date(schedule.schedule_start_time),
        scheduleEndTime: new Date(schedule.schedule_end_time),
        course: courseDetails,
      };
      return resultItem;
    });
  }

  async delete(roomCode: string): Promise<{ message: string }> {
    // First, verify the room exists to provide a better error message if not found.
    const { data: existingRoom, error: findError } = await this.supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 means 0 rows, handled below
        console.error(`Error finding room ${roomCode} before delete:`, findError);
        throw new Error(`Could not verify room before deletion. Error: ${findError.message}`);
    }

    if (!existingRoom) {
      throw new NotFoundException(`Room with code ${roomCode} not found.`);
    }

    // Proceed with deletion
    const { error: deleteError } = await this.supabase
      .from('rooms')
      .delete()
      .eq('room_code', roomCode);

    if (deleteError) {
      console.error(`Error deleting room with code ${roomCode}:`, deleteError);
      // You might want to check for specific error codes, e.g., foreign key violations
      // if ON DELETE CASCADE is not set on related tables (like schedules or room_comments referencing rooms.id)
      // and there are still dependent records.
      throw new Error(`Could not delete room with code ${roomCode}. Error: ${deleteError.message}`);
    }

    return { message: `Room with code ${roomCode} successfully deleted.` };
  }

  // ... other room service methods (findAll, findOne, update, remove)
}