import { Controller, Post, Body, UseGuards, Get, Patch, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './rooms.dto';
import { JwtGuard } from '../auth/auth.guard'; // Ensure you have the correct path to your JWT guard
import { CurrentRoomStatusDto, UpdateRoomDto } from './rooms.dto'; // Assuming you have a DTO for current room status
import { Room } from '../entities'; // Assuming you have a Room entity defined

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

  @Patch(':roomCode') // Using PATCH for partial updates
  // @UseGuards(AdminGuard) // Protect this route - likely only Admins can edit rooms
  updateRoom(
    @Param('roomCode') roomCode: string,
    @Body() updateRoomDto: UpdateRoomDto
  ): Promise<Room> {
    return this.roomsService.update(roomCode, updateRoomDto);
  }
    // ... other room endpoints (GET, PUT, DELETE)
}