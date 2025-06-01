import { Controller, Post, Body, UseGuards, Get, Patch, Param, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './rooms.dto';
import { JwtGuard } from '../auth/auth.guard'; // Ensure you have the correct path to your JWT guard
import { CurrentRoomStatusDto, UpdateRoomDto, RoomScheduleDto } from './rooms.dto'; // Assuming you have a DTO for current room status
import { Room } from '../entities'; // Assuming you have a Room entity defined
import { CommentResponseDto, CreateCommentDto } from 'src/auth/comment/comment.dto';
import { commentsService } from 'src/auth/comment/comment.service'; // Assuming you have a CommentsService for handling comments

@Controller('rooms')
@UseGuards(JwtGuard)
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly commentsService: commentsService, // Injecting the comments service
  ) {}

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

  @Get(':roomCode/schedules')
  getRoomSchedules(
    @Param('roomCode') roomCode: string,
  ): Promise<RoomScheduleDto[]> {
    return this.roomsService.findSchedulesByRoomCode(roomCode);
  }

  @Post(':roomCode/comments')
  async addComment(
    @Param('roomCode') roomCode: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any, // Access the request object
  ): Promise<CommentResponseDto> {
    const userId = req.user.id; // Assuming your AuthGuard attaches user to req, and user has an id
    if (!userId) {
      throw new Error('User ID not found on request. Ensure AuthGuard is working.');
    }
    return this.commentsService.addCommentToRoom(roomCode, userId, createCommentDto);
  }

  @Get(':roomCode/comments')
  async getComments(
    @Param('roomCode') roomCode: string,
  ): Promise<CommentResponseDto[]> {
    return this.commentsService.getCommentsForRoom(roomCode);
  }
    // ... other room endpoints (GET, PUT, DELETE)
}