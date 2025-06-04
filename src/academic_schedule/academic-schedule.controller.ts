// src/schedule/schedule.controller.ts
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { CreateAcademicScheduleDto } from './academic-schedule.dto';
import { AcademicScheduleResponseDto } from './academic-schedule.dto';
import { AdminGuard } from '../auth/admin.guard'; // Guard untuk admin/superadmin
import { AcademicScheduleService } from './academic-schedule.service';
import { JwtGuard } from 'src/auth/auth.guard';

@Controller('academic-schedule') // Prefix yang lebih spesifik untuk jadwal akademis
export class AcademicScheduleController { // Atau AcademicScheduleController
  constructor(private readonly academicscheduleService: AcademicScheduleService) {}

  @Post()
  @UseGuards(JwtGuard, AdminGuard) // Hanya admin/superadmin yang bisa membuat
  async create(
    @Body() createAcademicScheduleDto: CreateAcademicScheduleDto,
    // @Req() req: any, // Anda bisa mendapatkan adminId dari req.user jika perlu mencatat siapa yg membuat
  ): Promise<AcademicScheduleResponseDto> {
    return this.academicscheduleService.createAcademicSchedule(createAcademicScheduleDto);
  }

  @Get() // Endpoint to get all academic schedules with details
  @UseGuards(JwtGuard, AdminGuard) // Protect as needed, admins usually view this
  async getAllAcademicSchedulesWithDetails(): Promise<AcademicScheduleResponseDto[]> {
    return this.academicscheduleService.findAllWithDetails();
  }

  // Endpoint lain untuk GET, UPDATE, DELETE jadwal akademis bisa ditambahkan di sini
}