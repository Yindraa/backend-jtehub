// src/reservations/reservations.service.ts
import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, forwardRef } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CreateReservationDto } from './reservation.dto'; // Assuming DTOs are in reservation.dto.ts
import { ReservationResponseDto, ReservationStatus, ReservationUserInfoDto } from './reservation.dto';
import { UpdateReservationStatusDto } from './reservation.dto';
import { RoomsService } from '../rooms/rooms.service';
import { ScheduleService } from '../schedule/schedule.service'; // User's path
import { CreateScheduleDto } from '../schedule/schedule.dto';   // User's path
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationsService {
  private readonly supabase: SupabaseClient;

  constructor(
    @Inject(forwardRef(() => RoomsService))
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => ScheduleService))
    private readonly schedulesService: ScheduleService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided in .env file');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

 private combineDateTime(dateStr: string, timeStr: string): Date {
  if (!dateStr || !timeStr) {
    console.error(`combineDateTime received null/undefined input: date='${dateStr}', time='${timeStr}'`);
    return new Date(NaN); // Return Invalid Date
  }
  // timeStr from PostgreSQL TIME type is usually 'HH:MM:SS'
  // The 'T' separator is standard for ISO 8601 date and time combination.
  const dateTimeString = `${dateStr}T${timeStr}`; // e.g., "2025-07-02T09:00:00"
  
  const dateObj = new Date(dateTimeString);
  if (isNaN(dateObj.getTime())) {
    console.error(`combineDateTime failed to parse: '${dateTimeString}'`);
    return new Date(NaN); // Return Invalid Date if parsing failed
  }
  return dateObj;
}

  // ... rest of your existing methods (checkRoomAvailability, createReservation, etc.)
  // No changes needed to the body of those methods as they already call this.combineDateTime

  async checkRoomAvailability(roomId: string, startDateTime: Date, endDateTime: Date, excludeReservationId?: string): Promise<boolean> {
    // Check against existing schedules
    const { data: conflictingSchedules, error: scheduleError } = await this.supabase
      .from('schedules')
      .select('id')
      .eq('room_id', roomId)
      .lt('schedule_start_time', endDateTime.toISOString())
      .gt('schedule_end_time', startDateTime.toISOString());

    if (scheduleError) throw scheduleError;
    if (conflictingSchedules && conflictingSchedules.length > 0) return false;

    // Check against existing APPROVED reservations
    // This query part needs to be careful if reservation_date, start_time, end_time are separate
    // The previous logic for fetching and then iterating to combine is more robust for separate fields.
    const { data: approvedReservations, error: reservationError } = await this.supabase
      .from('room_reservations')
      .select('id, reservation_date, start_time, end_time') // Fetch necessary fields
      .eq('room_id', roomId)
      .eq('status', ReservationStatus.DISETUJUI)
      // Add a broader date filter to reduce records fetched, then filter precisely in code
      .or(`reservation_date.eq.${startDateTime.toISOString().split('T')[0]},reservation_date.eq.${endDateTime.toISOString().split('T')[0]}`);


    if (reservationError) throw reservationError;

    if (approvedReservations) {
        for (const res of approvedReservations) {
            if (excludeReservationId && res.id === excludeReservationId) continue;

            // Use the combineDateTime method here
            const resStart = this.combineDateTime(res.reservation_date, res.start_time);
            const resEnd = this.combineDateTime(res.reservation_date, res.end_time);

            if (startDateTime < resEnd && endDateTime > resStart) {
                return false; // Conflict found
            }
        }
    }
    return true;
  }


  async createReservation(userId: string, createDto: CreateReservationDto): Promise<ReservationResponseDto> {
    const { data: room, error: roomError } = await this.supabase
      .from('rooms')
      .select('id, room_name')
      .eq('room_code', createDto.roomCode)
      .single();

    if (roomError || !room) {
      throw new NotFoundException(`Room with code ${createDto.roomCode} not found.`);
    }

    // Use the combineDateTime method
    const startDateTime = this.combineDateTime(createDto.reservationDate, createDto.startTime);
    const endDateTime = this.combineDateTime(createDto.reservationDate, createDto.endTime);

    if (endDateTime <= startDateTime) {
      throw new BadRequestException('End time must be after start time.');
    }
    // Compare with current time, ignoring seconds/milliseconds for practical booking start times
    const now = new Date();
    const practicalNow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    if (startDateTime < practicalNow) {
        throw new BadRequestException('Reservation start time cannot be in the past.');
    }

    const isAvailable = await this.checkRoomAvailability(room.id, startDateTime, endDateTime);
    if (!isAvailable) {
      throw new ConflictException('The selected time slot for this room is not available.');
    }

    const { data: profileData, error: profileError } = await this.supabase
      .from('profiles')
      .select('id, fullname, username')
      .eq('id', userId)
      .single();
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 0 rows, which is handled by fallback
        console.error('Error fetching profile:', profileError); // Log other errors
    }
    // Warning for missing profile already handled if profileData is null/undefined

    const { data: newReservation, error: insertError } = await this.supabase
      .from('room_reservations')
      .insert({
        room_id: room.id,
        user_id: userId,
        purpose: createDto.purpose,
        reservation_date: createDto.reservationDate, // Storing as DATE
        start_time: createDto.startTime,             // Storing as TIME
        end_time: createDto.endTime,                 // Storing as TIME
        status: ReservationStatus.MENUNGGU,
      })
      .select('*') // Select all fields from the new reservation
      .single();

    if (insertError) {
      console.error('Error creating reservation:', insertError);
      throw new Error('Could not create reservation.');
    }
    
    const requestingUserDto: ReservationUserInfoDto = {
        id: userId,
        fullName: profileData?.fullname || 'User',
        username: profileData?.username || 'unknown_user',
    };

    return {
        id: newReservation.id,
        roomCode: createDto.roomCode,
        roomName: room.room_name,
        requestingUser: requestingUserDto,
        purpose: newReservation.purpose,
        reservationDate: newReservation.reservation_date, // Comes directly from DB
        startTime: newReservation.start_time,             // Comes directly from DB
        endTime: newReservation.end_time,                 // Comes directly from DB
        status: newReservation.status as ReservationStatus,
        requestedAt: new Date(newReservation.requested_at),
        requestedAtRelative: formatDistanceToNow(new Date(newReservation.requested_at), { addSuffix: true, locale: localeId }),
        // admin processing fields will be undefined/null here as it's a new reservation
    };
  }

  // findAllReservationsForAdmin, findMyReservations methods remain the same as your provided code.
  // They correctly map reservation_date, start_time, end_time from the DB.

  async findAllReservationsForAdmin(): Promise<ReservationResponseDto[]> {
    const { data, error } = await this.supabase
      .from('room_reservations')
      .select(`
        id,
        purpose,
        reservation_date,
        start_time,
        end_time,
        status,
        requested_at,
        admin_notes,
        processed_at,
        rooms (room_code, room_name),
        requesting_user_profile:profiles!room_reservations_user_id_fkey (id, fullname, username),
        processed_by_admin_profile:profiles!room_reservations_processed_by_admin_id_fkey (id, fullname, username)
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations for admin:', error);
      throw new Error('Could not fetch reservations.');
    }
    if (!data) return [];

    return data.map(res => {
      const reqUser = res.requesting_user_profile as any;
      const adminUser = res.processed_by_admin_profile as any;
      const roomInfo = res.rooms as any;

      return {
        id: res.id,
        roomCode: roomInfo?.room_code || 'N/A',
        roomName: roomInfo?.room_name || 'N/A',
        requestingUser: {
          id: reqUser?.id || 'N/A',
          fullName: reqUser?.fullname || 'User',
          username: reqUser?.username,
        },
        purpose: res.purpose,
        reservationDate: res.reservation_date,
        startTime: res.start_time,
        endTime: res.end_time,
        status: res.status as ReservationStatus,
        requestedAt: new Date(res.requested_at),
        requestedAtRelative: formatDistanceToNow(new Date(res.requested_at), { addSuffix: true, locale: localeId }),
        processedByAdmin: adminUser ? {
          id: adminUser.id,
          fullName: adminUser.fullname,
          username: adminUser.username,
        } : null,
        processedAt: res.processed_at ? new Date(res.processed_at) : null,
        processedAtRelative: res.processed_at ? formatDistanceToNow(new Date(res.processed_at), { addSuffix: true, locale: localeId }) : undefined,
        adminNotes: res.admin_notes,
      };
    });
  }

  async findMyReservations(userId: string): Promise<ReservationResponseDto[]> {
    const { data, error } = await this.supabase
      .from('room_reservations')
      .select(`
        id,
        purpose,
        reservation_date,
        start_time,
        end_time,
        status,
        requested_at,
        admin_notes,
        processed_at,
        rooms (room_code, room_name),
        processed_by_admin_profile:profiles!room_reservations_processed_by_admin_id_fkey (id, fullname)
      `)
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) throw new Error('Could not fetch your reservations.');
    if (!data) return [];

    const { data: currentUserProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('id, fullname, username')
        .eq('id', userId)
        .single();
    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching current user profile:', profileError);
    }

    const requestingUserDto: ReservationUserInfoDto = {
        id: userId,
        fullName: currentUserProfile?.fullname || 'User',
        username: currentUserProfile?.username
    };

    return data.map(res => {
        const adminUser = res.processed_by_admin_profile as any;
        const roomInfo = res.rooms as any;
        return {
            id: res.id,
            roomCode: roomInfo?.room_code || 'N/A',
            roomName: roomInfo?.room_name || 'N/A',
            requestingUser: requestingUserDto,
            purpose: res.purpose,
            reservationDate: res.reservation_date,
            startTime: res.start_time,
            endTime: res.end_time,
            status: res.status as ReservationStatus,
            requestedAt: new Date(res.requested_at),
            requestedAtRelative: formatDistanceToNow(new Date(res.requested_at), { addSuffix: true, locale: localeId }),
            processedByAdmin: adminUser ? { id: adminUser.id, fullName: adminUser.fullname, username: adminUser.username } : null, // Added username for consistency
            processedAt: res.processed_at ? new Date(res.processed_at) : null,
            processedAtRelative: res.processed_at ? formatDistanceToNow(new Date(res.processed_at), { addSuffix: true, locale: localeId }) : undefined,
            adminNotes: res.admin_notes,
        };
    });
  }


  async updateReservationStatus(
    reservationId: string,
    adminId: string,
    updateDto: UpdateReservationStatusDto,
  ): Promise<ReservationResponseDto> {
    const { data: reservation, error: fetchError } = await this.supabase
      .from('room_reservations')
      .select('*, rooms(room_code, room_name), requesting_user_profile:profiles!room_reservations_user_id_fkey(id, fullname, username)')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found.`);
    }

    if (reservation.status !== ReservationStatus.MENUNGGU) {
        throw new ConflictException(`Reservation has already been processed. Current status: ${reservation.status}`);
    }

    // Inside updateReservationStatus, before calling combineDateTime:
    // console.log('Fetched reservation data before combining date/time:', {
    //   id: reservation.id,
    //   date: reservation.reservation_date,
    //   start: reservation.start_time,
    //   end: reservation.end_time,
    //   status: reservation.status
    // });

    const startDateTime = this.combineDateTime(reservation.reservation_date, reservation.start_time);
    const endDateTime = this.combineDateTime(reservation.reservation_date, reservation.end_time);

    // Also log the created Date objects to see if they are already invalid here
    // console.log('Combined JavaScript Date objects:', {
    //     startDateTimeObject: startDateTime,
    //     isStartDateTimeValid: !isNaN(startDateTime.getTime()),
    //     endDateTimeObject: endDateTime,
    //     isEndDateTimeValid: !isNaN(endDateTime.getTime())
    // });

    if (updateDto.status === ReservationStatus.DISETUJUI) {
      const isAvailable = await this.checkRoomAvailability(reservation.room_id, startDateTime, endDateTime, reservationId);
      if (!isAvailable) {
        throw new ConflictException('The selected time slot for this room is no longer available or conflicts with another approved booking/schedule.');
      }
    }

    const { data: updatedReservation, error: updateError } = await this.supabase
      .from('room_reservations')
      .update({
        status: updateDto.status,
        admin_notes: updateDto.adminNotes,
        processed_by_admin_id: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select('*') // Select all from updated reservation
      .single();

    if (updateError) {
      console.error('Error updating reservation status:', updateError);
      throw new Error('Could not update reservation status.');
    }

    if (updatedReservation.status === ReservationStatus.DISETUJUI) {
      const requestingUser = reservation.requesting_user_profile as any;
      const roomInfo = reservation.rooms as any; // Get room info from the initially fetched reservation

      const scheduleDto: CreateScheduleDto = {
        courseName: updatedReservation.purpose,
        courseCode: `RES-${updatedReservation.id.substring(0, 8)}`,
        lecturer: requestingUser?.fullname || 'Reserved User',
        scheduleStartTime: startDateTime.toISOString(), // Use combined start time
        scheduleEndTime: endDateTime.toISOString(),     // Use combined end time
        roomCode: roomInfo?.room_code,               // Use room_code from fetched roomInfo
        semester: 0, // Or null if your schedules table allows null for semester
      };
      try {
        await this.schedulesService.create(scheduleDto);
      } catch (scheduleCreationError) {
        console.error('CRITICAL: Failed to create schedule after reservation approval:', scheduleCreationError);
        // Add more robust error handling here, e.g., revert reservation status or log for manual fix.
      }
    }
    
    const { data: adminProfile, error: adminProfileError } = await this.supabase
        .from('profiles')
        .select('id, fullname, username')
        .eq('id', adminId)
        .single();
     if (adminProfileError && adminProfileError.code !== 'PGRST116') {
        console.error('Error fetching admin profile:', adminProfileError);
    }

    const requestingUserDto: ReservationUserInfoDto = {
        id: (reservation.requesting_user_profile as any)?.id,
        fullName: (reservation.requesting_user_profile as any)?.fullname || 'User',
        username: (reservation.requesting_user_profile as any)?.username
    };
     const adminUserDto: ReservationUserInfoDto | null = adminProfile ? {
        id: adminProfile.id,
        fullName: adminProfile.fullname,
        username: adminProfile.username
    } : null;

    return {
        id: updatedReservation.id,
        roomCode: (reservation.rooms as any)?.room_code,
        roomName: (reservation.rooms as any)?.room_name,
        requestingUser: requestingUserDto,
        purpose: updatedReservation.purpose,
        reservationDate: updatedReservation.reservation_date, // From DB
        startTime: updatedReservation.start_time,             // From DB
        endTime: updatedReservation.end_time,                 // From DB
        status: updatedReservation.status as ReservationStatus,
        requestedAt: new Date(updatedReservation.requested_at),
        requestedAtRelative: formatDistanceToNow(new Date(updatedReservation.requested_at), { addSuffix: true, locale: localeId }),
        processedByAdmin: adminUserDto,
        processedAt: updatedReservation.processed_at ? new Date(updatedReservation.processed_at) : null,
        processedAtRelative: updatedReservation.processed_at ? formatDistanceToNow(new Date(updatedReservation.processed_at), { addSuffix: true, locale: localeId }) : undefined,
        adminNotes: updatedReservation.admin_notes,
    };
  }

}