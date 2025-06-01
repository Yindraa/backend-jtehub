// src/reservations/reservations.controller.ts
import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Or your custom AuthGuard
import { ReservationsService } from './reservation.service';
import { CreateReservationDto, ReservationResponseDto, UpdateReservationStatusDto } from './reservation.dto';
import { JwtGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
// import { AdminGuard } from '../auth/guards/admin.guard'; // If you have a specific admin guard

@Controller('reservations')
@UseGuards(JwtGuard) // Ensure this is the correct guard for your authentication
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  async createReservation(
    @Req() req: any,
    @Body() createDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User not authenticated.');
    return this.reservationsService.createReservation(userId, createDto);
  }

  @Get('admin')
  // @UseGuards(AdminGuard)
  @UseGuards(AdminGuard)
  async getAllReservationsForAdmin(): Promise<ReservationResponseDto[]> {
    // Ensure req.user has a role or a way to verify admin status if not using AdminGuard
    return this.reservationsService.findAllReservationsForAdmin();
  }

  @Get('my')
  async getMyReservations(@Req() req: any): Promise<ReservationResponseDto[]> {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User not authenticated.');
    return this.reservationsService.findMyReservations(userId);
  }

  @Patch(':reservationId/status')
  // @UseGuards(AdminGuard)
  @UseGuards(AdminGuard) // Ensure this is the correct guard for admin actions
  async updateReservationStatus(
    @Param('reservationId') reservationId: string,
    @Req() req: any,
    @Body() updateDto: UpdateReservationStatusDto,
  ): Promise<ReservationResponseDto> {
    const adminId = req.user?.id;
    if (!adminId) throw new BadRequestException('Admin not authenticated.');
    // Add role check here if not using a dedicated AdminGuard
    return this.reservationsService.updateReservationStatus(reservationId, adminId, updateDto);
  }
}