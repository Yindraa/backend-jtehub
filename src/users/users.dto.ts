// src/admin/dto/user-management-view.dto.ts
// src/admin/dto/update-user-role.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';

// Define the enum in a DTO file to be reusable
export enum UserRole {
  REGULAR = 'regular',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  role: UserRole;
}
export class UserManagementViewDto {
  id: string; // user_id / profile_id
  fullName: string | null;
  username: string | null;
  email: string | null;
  role: UserRole;
  lastSignInAt: Date | string | null; // Can be Date or formatted string
  lastSignInAtRelative?: string; // e.g., "3 hours ago"
}