// auth.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { UpdateProfileDto } from './profile.dto';
import { Request, Response } from 'express';
import { JwtGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/user.decorator';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService ) {}

  // Other endpoints: register, login, etc.

  @Patch('')
  async updateUser(
    @GetUser() user: {id: string},
    @Body() updateDto: UpdateProfileDto,
    @Res() res: Response,
  ) {
    return this.profileService.updateUser(user.id, updateDto, res);
  }

  @Delete('')
  async deleteUser(
    @GetUser() user: {id: string},
    @Res() res: Response,
  ) {
    return this.profileService.deleteUser(user.id, res);
  }

  @Get('')
  async getUser(
    @GetUser() user: {id: string}
  ) {
    return this.profileService.getProfile(user.id);
  }
}
