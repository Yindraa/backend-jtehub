import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CreateRoomDto } from './rooms.dto';
import { Room } from '../entities'; // Assuming you have a Room entity defined
import { CurrentRoomStatusDto, UpdateRoomDto } from './rooms.dto'; // Assuming you have a DTO for current room status

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

  // ... other room service methods (findAll, findOne, update, remove)
}