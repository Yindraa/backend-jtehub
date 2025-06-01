// src/admin/admin.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { UpdateUserRoleDto, UserManagementViewDto, UserRole } from './users.dto';

// Define Profile type based on your table
interface Profile {
  id: string;
  fullname: string | null;
  username: string | null;
  role: UserRole;
  nim_nidn?: string | null; // Optional NIM/NIDN field
  // other profile fields...
}

@Injectable()
export class UserService {
  private supabaseAdmin: SupabaseClient; // Client initialized with SERVICE_ROLE_KEY

  constructor(
    private readonly configService: ConfigService,
    // Inject your regular Supabase client if needed for other non-admin operations,
    // or if your main Supabase client is already service_role (less common for general use)
    // @Inject('SUPABASE_CLIENT') private supabaseUserClient: SupabaseClient,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_KEY'); // Ensure this is in your .env

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase URL and Service Role Key must be provided for admin operations.');
    }
    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  }

  async getAllUsersForSuperAdmin(): Promise<UserManagementViewDto[]> {
    // 1. Fetch all users from auth.users using the admin client
    const { data: { users: authUsers }, error: authError } = await this.supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw new Error('Could not fetch users from authentication system.');
    }
    if (!authUsers) return [];

    // 2. Fetch all profiles from public.profiles
    // We can use the admin client here as well, or a regular client if RLS allows reading profiles
    const { data: profiles, error: profilesError } = await this.supabaseAdmin
      .from('profiles')
      .select('id, fullname, username, role, nim_nidn'); // Include nimNidn if needed, or remove if not applicable

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw new Error('Could not fetch user profiles.');
    }
    if (!profiles) return [];

    // 3. Merge the data
    const profilesMap = new Map<string, Profile>(profiles.map(p => [p.id, p as Profile]));

    return authUsers.map(authUser => {
      const profile = profilesMap.get(authUser.id);
      return {
        id: authUser.id,
        fullName: profile?.fullname || null,
        username: profile?.username || null,
        email: authUser.email || null,
        role: profile?.role || UserRole.REGULAR, // Default if profile or role is missing
        lastSignInAt: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null,
        lastSignInAtRelative: authUser.last_sign_in_at
          ? formatDistanceToNow(new Date(authUser.last_sign_in_at), { addSuffix: true, locale: localeId })
          : undefined,
        nim_nidn: profile?.nim_nidn // Include NIM/NIDN if available
      };
    });
  }

  async updateUserRole(
    userIdToUpdate: string,
    updateUserRoleDto: UpdateUserRoleDto,
    actingAdminId: string // ID of the superadmin performing the action
  ): Promise<UserManagementViewDto> {
    const newRole = updateUserRoleDto.role;

    // Optional: Prevent superadmin from demoting themselves if they are the only one
    if (userIdToUpdate === actingAdminId && newRole !== UserRole.SUPERADMIN) {
      // Query to check if there are other superadmins
      const { count: superAdminCount, error: countError } = await this.supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', UserRole.SUPERADMIN);

      if (countError) throw new Error("Could not verify superadmin count.");
      if (superAdminCount !== null && superAdminCount <= 1) {
        throw new BadRequestException('Cannot demote the only superadmin.');
      }
    }
    
    // Optional: Prevent a superadmin from changing another superadmin's role (adjust as per your rules)
    // const { data: targetUserProfile, error: targetUserError } = await this.supabaseAdmin
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', userIdToUpdate)
    //   .single();
    // if (targetUserProfile?.role === UserRole.SUPERADMIN && userIdToUpdate !== actingAdminId) {
    //   throw new ForbiddenException("Superadmins cannot change other superadmins' roles through this endpoint.");
    // }


    const { data: updatedProfile, error } = await this.supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userIdToUpdate)
      .select('id, fullname, username, role')
      .single();

    if (error || !updatedProfile) {
      console.error('Error updating user role:', error);
      throw new NotFoundException(`Profile for user ID ${userIdToUpdate} not found or could not be updated.`);
    }

    // Fetch the corresponding auth user data to construct the full DTO
    const { data: { user: authUser }, error: authUserError } = await this.supabaseAdmin.auth.admin.getUserById(userIdToUpdate);
    if (authUserError || !authUser) {
      console.warn(`Auth user not found for ID ${userIdToUpdate} after role update, returning partial profile.`);
    }

    return {
      id: updatedProfile.id,
      fullName: updatedProfile.fullname,
      username: updatedProfile.username,
      email: authUser?.email || null,
      role: updatedProfile.role as UserRole,
      lastSignInAt: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null,
      lastSignInAtRelative: authUser?.last_sign_in_at
        ? formatDistanceToNow(new Date(authUser.last_sign_in_at), { addSuffix: true, locale: localeId })
        : undefined,
    };
  }
}