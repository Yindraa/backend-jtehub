// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ConfigModule } from '@nestjs/config'; // Jika service butuh ConfigService
import { commentsService } from 'src/auth/comment/comment.service';

@Module({
  imports: [ConfigModule], // Impor ConfigModule jika DashboardService menggunakannya untuk Supabase client
  controllers: [DashboardController],
  providers: [DashboardService, commentsService],
})
export class DashboardModule {}