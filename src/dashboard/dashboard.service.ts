// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DashboardResponseDto, RoomUsageDto, CommentDistributionDto, HourlyRoomAvailabilityDto, Reservation, RoomRatingSatisfactionDto, DashboardAnalyticsResponseDto } from './dashboard.dto';

// Define ReservationFromDB type if not already defined or imported
type ReservationFromDB = {
  room_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
};
import { 
    addHours, 
    startOfHour, 
    subDays, 
    eachHourOfInterval, 
    getHours, 
    formatISO, 
    isBefore 
} from 'date-fns';
import { Schedule } from 'src/entities';

@Injectable()
export class DashboardService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided for DashboardService.');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Helper to combine date and time (similar to ReservationsService but might be slightly different context)
  private combineDateTimeForDashboard(dateStr: string, timeStr: string): Date {
    if (!dateStr || !timeStr) {
        // console.warn(`combineDateTimeForDashboard received null/undefined input: date='${dateStr}', time='${timeStr}'`);
        return new Date(NaN); // Return Invalid Date
    }
    // timeStr dari PostgreSQL TIME type adalah 'HH:MM:SS'
    const dateTimeString = `${dateStr}T${timeStr}`;
    const dateObj = new Date(dateTimeString);
    if (isNaN(dateObj.getTime())) {
        // console.warn(`combineDateTimeForDashboard failed to parse: '${dateTimeString}'`);
        return new Date(NaN); // Return Invalid Date if parsing failed
    }
    return dateObj;
  }


  async getDashboardData(): Promise<DashboardResponseDto> {
    const now = new Date();
    const todayDateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format for today

    // ... (totalRoomsData, newRoomsData logic remains the same) ...
    const { data: totalRoomsData, error: totalRoomsError } = await this.supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true });
    if (totalRoomsError) throw new Error('Failed to fetch total rooms count.');
    const totalRooms = totalRoomsData?.length ?? (await this.supabase.from('rooms').select('id', { count: 'exact' })).count ?? 0;


    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: newRoomsData, error: newRoomsError } = await this.supabase
      .from('rooms')
      .select('id', { count: 'exact' })
      .gte('created_at', firstDayOfMonth)
      .lt('created_at', firstDayOfNextMonth);
    if (newRoomsError) throw new Error('Failed to fetch new rooms this month.');
    const newRoomsThisMonth = newRoomsData?.length ?? 0;

    // 2. Ruangan Aktif - CORRECTED LOGIC for separate date/time columns
    const activeRoomIds = new Set<string>();

    // Active from schedules
    const { data: activeScheduleRooms, error: activeScheduleErr } = await this.supabase
      .from('schedules')
      .select('room_id')
      .lte('schedule_start_time', now.toISOString())
      .gte('schedule_end_time', now.toISOString());
    if (activeScheduleErr) {
        console.error('Supabase error fetching active schedule rooms:', JSON.stringify(activeScheduleErr, null, 2));
        throw new Error('Failed to fetch active schedule rooms.');
    }
    activeScheduleRooms?.forEach(r => r.room_id && activeRoomIds.add(r.room_id));

    // Active from approved reservations (fetching for today and then filtering by time)
    const { data: todayApprovedReservations, error: activeReservationErr } = await this.supabase
      .from('room_reservations')
      .select('room_id, reservation_date, start_time, end_time')
      .eq('status', 'disetujui') // Use the status string directly if enum is not available
      .eq('reservation_date', todayDateString); // Filter for today's date

    if (activeReservationErr) {
        console.error('Supabase error fetching today\'s approved reservations:', JSON.stringify(activeReservationErr, null, 2));
        throw new Error('Failed to fetch active reservation rooms.');
    }

    todayApprovedReservations?.forEach(res => {
      if (res.room_id && res.reservation_date && res.start_time && res.end_time) {
        const resStart = this.combineDateTimeForDashboard(res.reservation_date, res.start_time);
        const resEnd = this.combineDateTimeForDashboard(res.reservation_date, res.end_time);
        if (!isNaN(resStart.getTime()) && !isNaN(resEnd.getTime())) {
          if (resStart <= now && resEnd >= now) {
            activeRoomIds.add(res.room_id);
          }
        }
      }
    });
    const activeRooms = activeRoomIds.size;

    // 3. Jumlah Ruangan Kosong
    const emptyRooms = totalRooms - activeRooms;

    // ... (commentStats and topUsedRooms logic - topUsedRooms RPC will need similar adjustment if it assumed TIMESTAMPTZ) ...
    // 4. Komentar Positif & Distribusi Komentar
    const { data: commentStats, error: commentStatsError } = await this.supabase
      .from('room_comments')
      .select('rating') 
      
    if (commentStatsError) throw new Error('Failed to fetch comment stats.');

    let positiveComments = 0;
    let negativeComments = 0;
    const totalComments = commentStats?.length || 0;
    commentStats?.forEach(comment => {
        if (comment.rating >= 3) positiveComments++;
        else if (comment.rating < 3) negativeComments++;
    });
    const commentDistribution: CommentDistributionDto = {
        positiveComments,
        negativeComments,
        totalComments,
    };

    // 5. Ruangan Paling Sering Digunakan (Top 5 by Duration)
    // The RPC function 'get_top_used_rooms_by_duration' MUST also be written
    // to work with separate reservation_date, start_time, end_time if it's currently
    // assuming reservation_start and reservation_end (TIMESTAMPTZ).
    // If the RPC is not yet updated, this call might fail or give incorrect results.
    const { data: topUsedRoomsData, error: topUsedError } = await this.supabase
      .rpc('get_top_used_rooms_by_duration');

    if (topUsedError) {
        console.error('Error fetching top used rooms. Ensure RPC function "get_top_used_rooms_by_duration" is compatible with current reservation table structure.', topUsedError);
    }
    const topUsedRooms: RoomUsageDto[] = topUsedRoomsData || [];


    return {
      totalRooms,
      newRoomsThisMonth,
      activeRooms,
      emptyRooms,
      positiveCommentCount: positiveComments,
      commentDistribution,
      topUsedRooms,
    };
  }

  // Helper untuk menggabungkan tanggal dan waktu dari reservasi
  private combineReservationDateTime(dateStr: string, timeStr: string): Date {
    if (!dateStr || !timeStr) return new Date(NaN);
    return new Date(`${dateStr}T${timeStr}`);
  }

  async getAnalyticsData(): Promise<DashboardAnalyticsResponseDto> {
    // --- 1. Tingkat Kepuasan Pengguna (Distribusi Rating Komentar) ---
    const { data: ratingData, error: ratingError } = await this.supabase
      .rpc('get_comment_ratings_distribution'); // Panggil fungsi RPC

    if (ratingError) {
      console.error('Error fetching room rating satisfaction via RPC:', JSON.stringify(ratingError, null, 2));
      throw new Error('Failed to fetch room rating satisfaction data.');
    }
    const roomRatingSatisfaction: RoomRatingSatisfactionDto[] = (ratingData || []).map(item => ({
        rating: Number(item.rating),
        count: Number(item.count)
    }));


    // --- 2. Waktu Ruangan Paling Sering Kosong (Rata-rata per Jam selama 7 Hari Terakhir) ---
    const now = new Date(); // Waktu server saat ini
    const upToHour = startOfHour(now); // Sampai awal jam saat ini
    const sevenDaysAgoStart = startOfHour(subDays(upToHour, 7)); // Tepat 7 hari lalu, di awal jam

    // a. Get total rooms
    const { count: totalRooms, error: totalRoomsError } = await this.supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true });

    if (totalRoomsError) {
        console.error('Error fetching total rooms count:', JSON.stringify(totalRoomsError, null, 2));
        throw new Error('Failed to fetch total rooms count for analytics.');
    }
    if (totalRooms === null) {
        throw new Error('Could not determine total rooms (count returned null).');
    }
    
    // b. Fetch relevant schedules for the last 7 days (yang mungkin tumpang tindih dengan rentang waktu kita)
    const { data: schedulesLastWeekData, error: schedulesError } = await this.supabase
      .from('schedules')
      .select('room_id, schedule_start_time, schedule_end_time')
      .lt('schedule_start_time', upToHour.toISOString()) // Mulai sebelum akhir rentang kita
      .gte('schedule_end_time', sevenDaysAgoStart.toISOString()); // Berakhir setelah awal rentang kita

    if (schedulesError) {
        console.error('Error fetching schedules for analytics:', JSON.stringify(schedulesError, null, 2));
        throw new Error('Failed to fetch schedules for analytics.');
    }
    type ScheduleForAnalytics = { room_id: string; schedule_start_time: string; schedule_end_time: string };
    const schedulesLastWeek: ScheduleForAnalytics[] = schedulesLastWeekData || [];

    // c. Fetch relevant approved reservations for the last 7 days
    const sevenDaysAgoDateOnly = formatISO(sevenDaysAgoStart, { representation: 'date' });
    const todayDateOnly = formatISO(upToHour, { representation: 'date' });

    const { data: reservationsLastWeekData, error: reservationsError } = await this.supabase
      .from('room_reservations')
      .select('room_id, reservation_date, start_time, end_time')
      .eq('status', 'disetujui')
      .gte('reservation_date', sevenDaysAgoDateOnly) // Reservasi yang tanggalnya dalam 7 hari terakhir
      .lte('reservation_date', todayDateOnly);
      
    if (reservationsError) {
        console.error('Error fetching reservations for analytics:', JSON.stringify(reservationsError, null, 2));
        throw new Error('Failed to fetch reservations for analytics.');
    }
    const reservationsLastWeek: ReservationFromDB[] = reservationsLastWeekData || [];

    // d. Process hourly slots
    const hourlySlots = eachHourOfInterval({ start: sevenDaysAgoStart, end: subDays(upToHour,1) }); // Slot jam penuh terakhir
    const emptyRoomsByHourOfDay: { [hour: number]: number[] } = {};

    for (const slotStart of hourlySlots) {
      const slotEnd = addHours(slotStart, 1);
      let occupiedRoomIdsInSlot = new Set<string>();

      // Check schedules
      schedulesLastWeek.forEach(sch => {
        const schStart = new Date(sch.schedule_start_time);
        const schEnd = new Date(sch.schedule_end_time);
        if (schStart < slotEnd && schEnd > slotStart) { // Overlap condition
          occupiedRoomIdsInSlot.add(sch.room_id);
        }
      });

      // Check reservations
      reservationsLastWeek.forEach(res => {
        // Hanya proses reservasi yang tanggalnya relevan dengan slotStart saat ini
        // (Optimasi kecil, karena kita sudah filter berdasarkan rentang tanggal yang luas)
        if (res.reservation_date === formatISO(slotStart, { representation: 'date'}) || 
            res.reservation_date === formatISO(addHours(slotStart, -23), { representation: 'date'} ) // Handle cases where slotStart is near midnight
        ) {
            const resStart = this.combineDateTimeForDashboard(res.reservation_date, res.start_time);
            const resEnd = this.combineDateTimeForDashboard(res.reservation_date, res.end_time);
            
            if (isNaN(resStart.getTime()) || isNaN(resEnd.getTime())) return; // Skip invalid combined dates

            if (resStart < slotEnd && resEnd > slotStart) { // Overlap condition
              occupiedRoomIdsInSlot.add(res.room_id);
            }
        }
      });
      
      const emptyRoomCountInSlot = totalRooms - occupiedRoomIdsInSlot.size;
      const hourOfDay = getHours(slotStart); // Jam (0-23) UTC, sesuaikan jika perlu ke timezone lokal untuk grouping

      if (!emptyRoomsByHourOfDay[hourOfDay]) {
        emptyRoomsByHourOfDay[hourOfDay] = [];
      }
      emptyRoomsByHourOfDay[hourOfDay].push(emptyRoomCountInSlot);
    }

    const hourlyRoomAvailability: HourlyRoomAvailabilityDto[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const countsForHour = emptyRoomsByHourOfDay[hour] || [];
      const averageEmpty = countsForHour.length > 0
        ? countsForHour.reduce((sum, count) => sum + count, 0) / countsForHour.length
        : totalRooms; // Jika tidak ada data untuk jam tersebut (misalnya, tidak ada slot di jam itu selama 7 hari),
                      // anggap semua ruangan kosong, atau bisa juga 0 jika lebih masuk akal.
                      // totalRooms mungkin lebih representatif untuk "biasanya kosong pada jam ini jika tidak ada aktivitas tercatat".
      hourlyRoomAvailability.push({ hour, averageEmptyRooms: parseFloat(averageEmpty.toFixed(2)) });
    }

    return {
      hourlyRoomAvailability,
      roomRatingSatisfaction,
    };
  }
}