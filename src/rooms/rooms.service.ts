import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CreateRoomDto } from './rooms.dto';
import { Room } from '../entities'; // Assuming you have a Room entity defined

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

  // ... other room service methods (findAll, findOne, update, remove)
}