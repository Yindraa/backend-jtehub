import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CreateRoomDto } from './rooms.dto';
import { Room } from '../entities'; // Assuming you have a Room entity defined
import { CurrentRoomStatusDto } from './rooms.dto'; // Assuming you have a DTO for current room status

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

  async findCurrentStatus(): Promise<CurrentRoomStatusDto[]> {
    const { data, error } = await this.supabase
      .rpc('get_current_room_status'); // Call the function

    if (error) {
      console.error('Error fetching current room status:', error);
      throw new Error('Could not fetch current room status.');
    }

    // Map the data to our DTO (optional but good practice for consistency)
    return data.map(item => ({
        roomId: item.room_id,
        roomCode: item.room_code,
        roomName: item.room_name,
        status: item.status,
        capacity: item.capacity,
        rating: item.rating,
        courseName: item.course_name,
        lecturerName: item.lecturer_name,
        scheduleStartTime: item.schedule_start_time,
        scheduleEndTime: item.schedule_end_time,
    }));
  }

  // ... other room service methods (findAll, findOne, update, remove)
}