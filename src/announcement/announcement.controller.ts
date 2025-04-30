import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Patch, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/user.decorator';
import { AnnouncementService } from './announcement.service';
import { StockAnnouncementsResponseDto } from './announcement.dto';

@Controller('announcement')
@UseGuards(JwtGuard) // for all routes
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get('')
  async getAnnouncements(
    @GetUser() user: { id: string },
  ): Promise<StockAnnouncementsResponseDto> {
    return this.announcementService.getAnnouncements(user.id);
  }

  @Post('check')
  async checkAnnouncements(
    @GetUser() user: { id: string },
  ): Promise<{ message: string }> {
    await this.announcementService.checkAndCreateAnnouncements(user.id);
    return { message: 'Stock checks completed and announcements created if needed' };
  }

  @Patch(':id/dismiss')
  async dismissAnnouncement(
    @Param('id', ParseUUIDPipe) id: string, 
    @GetUser() user: { id: string },
  ): Promise<{ message: string }> {
    await this.announcementService.dismissAnnouncement(id, user.id);
    return { message: 'Announcement dismissed successfully' };
  }
}
