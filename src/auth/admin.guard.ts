// src/auth/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserRole } from 'src/users/users.dto'; // Adjust the import path as necessary
@Injectable()
export class AdminGuard implements CanActivate {
  private supabaseForGuard: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials needed for AdminGuard');
    }
    this.supabaseForGuard = createClient(supabaseUrl, supabaseKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From AuthGuard('jwt')

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required.');
    }

    const { data: profile, error } = await this.supabaseForGuard
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("AdminGuard: Error fetching user's profile:", error);
      throw new ForbiddenException('Could not verify user role.');
    }

    if (profile && (profile.role === UserRole.ADMIN || profile.role === UserRole.SUPERADMIN)) {
      return true; // User is an admin or superadmin
    }

    throw new ForbiddenException('Access denied. Admin or Superadmin role required.');
  }
}