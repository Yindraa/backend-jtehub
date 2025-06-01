// src/auth/guards/superadmin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Assuming you have a way to inject your primary user-context Supabase client
// If your AdminService already has a supabaseAdmin (service_role) client,
// using that to check the acting user's role might require passing the acting user's ID.
// Simpler is to check the role of the currently authenticated user (req.user.id)
// against the 'profiles' table using a regular or admin client.

// For this guard, we will use the service_role client from AdminService if it were injectable,
// or create a temporary one if needed solely for this check.
// A better pattern would be to have a ProfilesService that can fetch a profile by ID.

// Let's assume you have a ProfilesService or similar to get a user's role
// For this example, we'll inject the main Supabase client (user context or service role if available globally for such reads)
// Or, more directly, if this guard is used AFTER an AuthGuard, req.user should have the user ID.
import { ConfigService } from '@nestjs/config'; // If creating a client here
import { UserRole } from 'src/users/users.dto';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private supabaseForGuard: SupabaseClient; // Can be service_role for this specific check

  constructor(
      private readonly configService: ConfigService,
      // OPTIONALLY: Inject ProfilesService if you have one
      // private readonly profilesService: ProfilesService
  ) {
      // This guard might need its own Supabase client if not using a shared admin client
      // For simplicity, let's assume it can make a query.
      // In a real app, you might already have a way to get user roles efficiently.
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase credentials needed for SuperAdminGuard');
      }
      this.supabaseForGuard = createClient(supabaseUrl, serviceRoleKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assumes a previous AuthGuard (like AuthGuard('jwt')) has run and populated request.user

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required.');
    }

    const { data: profile, error } = await this.supabaseForGuard // Use a client that can read profiles
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Error fetching user's profile for role check:", error);
      throw new ForbiddenException('Could not verify user role.');
    }

    if (profile && profile.role === UserRole.SUPERADMIN) {
      return true;
    }

    throw new ForbiddenException('Access denied. Superadmin role required.');
  }
}