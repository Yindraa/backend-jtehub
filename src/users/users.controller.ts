// src/admin/admin.controller.ts
import { Controller, Get, UseGuards, Param, Patch, Body, Req } from '@nestjs/common';
import { UserService } from './users.service';
import { AuthGuard } from '@nestjs/passport'; // Or your primary JWT AuthGuard
import { SuperAdminGuard } from 'src/auth/superadmin.guard'; // Custom guard for super admin
import { JwtGuard } from 'src/auth/auth.guard';
import { UpdateUserRoleDto, UserManagementViewDto } from './users.dto';

@Controller('user') // Base route for user management
@UseGuards(JwtGuard, SuperAdminGuard) // Protect all routes in this controller
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  async getAllUsers(): Promise<UserManagementViewDto[]> {
    return this.userService.getAllUsersForSuperAdmin();
  }

  @Patch(':userId/role')
  async updateUserRole(
    @Param('userId') userIdToUpdate: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() req: any, // To get the ID of the admin performing the action
  ): Promise<UserManagementViewDto> {
    const actingAdminId = req.user.id; // ID of the superadmin making the request
    return this.userService.updateUserRole(userIdToUpdate, updateUserRoleDto, actingAdminId);
  }
}