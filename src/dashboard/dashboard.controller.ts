// dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dashboard.dto';

// Example of a custom guard or decorator that injects userId
// (Implementation depends on your Auth setup.)
import { JwtGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/user.decorator';

@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(
    @GetUser() user: { id: string },
    @Query('lowStockThreshold') lowStockThreshold = '5',
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboardData(user.id, Number(lowStockThreshold));
  }
}
