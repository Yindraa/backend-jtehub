// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardAnalyticsResponseDto, DashboardResponseDto} from './dashboard.dto';
import { AllCommentsResponseDto } from 'src/auth/comment/comment.dto';
import { commentsService } from 'src/auth/comment/comment.service';
// import { AdminGuard } from '../auth/guards/admin.guard'; // Jika dasbor hanya untuk admin
// import { AuthGuard } from '@nestjs/passport';

@Controller('dashboard')
// @UseGuards(AuthGuard('jwt'), AdminGuard) // Lindungi endpoint ini jika perlu
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly commentsService: commentsService, // Assuming you have a CommentsService to handle comments
) {}

  @Get()
  async getDashboardData(): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboardData();
  }

  @Get('/comments')
   // Or AdminGuard if admins can also see this
  async getAllComments(): Promise<AllCommentsResponseDto[]> {
    return this.commentsService.getAllCommentsAcrossRooms();
  }

  @Get('analytics') // Endpoint baru
  async getDashboardAnalytics(): Promise<DashboardAnalyticsResponseDto> {
    return this.dashboardService.getAnalyticsData();
  }
}