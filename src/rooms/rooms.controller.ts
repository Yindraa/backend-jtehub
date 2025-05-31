import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './rooms.dto';
import { JwtGuard } from '../auth/auth.guard'; // Ensure you have the correct path to your JWT guard
import { CurrentRoomStatusDto } from './rooms.dto'; // Assuming you have a DTO for current room status

@Controller('rooms')
@UseGuards(JwtGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  // @UseGuards(AdminGuard) // Protect this route - likely only Admins can create rooms
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }
  @Get('current-status')
  getCurrentStatus(): Promise<CurrentRoomStatusDto[]> {
    return this.roomsService.findCurrentStatus();
  }
    // ... other room endpoints (GET, PUT, DELETE)
}