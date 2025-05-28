import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './schedule.dto';
import { JwtGuard } from 'src/auth/auth.guard';

@Controller('schedule')
@UseGuards(JwtGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Post()
  async create(@Body() dto: CreateScheduleDto) {
    return this.service.create(dto);
  }

  // Other endpoints remain similar
}