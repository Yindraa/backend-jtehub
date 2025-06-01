import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto, ScheduleDetailsDto } from './schedule.dto';
import { JwtGuard } from 'src/auth/auth.guard';

@Controller('schedule')
@UseGuards(JwtGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Post()
  async create(@Body() dto: CreateScheduleDto) {
    return this.service.create(dto);
  }
  @Get() // You can choose a more specific path like '/details' if '/schedules' is already used
  // @UseGuards(AuthGuard('jwt')) // Add authentication if this list should be protected
  async getAllSchedulesWithDetails(): Promise<ScheduleDetailsDto[]> {
    return this.service.findAllWithDetails();
  }

  // Other endpoints remain similar
}