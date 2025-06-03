// src/schedule/schedule.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Pastikan ConfigModule diimpor jika belum global
import { AcademicScheduleService } from './academic-schedule.service';
import { AcademicScheduleController } from './academic-schedule.controller';

@Module({
  imports: [ConfigModule], // Atau jika ConfigModule sudah global, ini tidak wajib
  controllers: [AcademicScheduleController],
  providers: [AcademicScheduleService],
  exports: [AcademicScheduleService], // Ekspor jika service ini akan dipakai module lain
})
export class AcademicScheduleModule {}