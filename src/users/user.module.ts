// src/users/admin.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { ProfileModule } from 'src/profile/profile.module'; // Import ProfilesModule to access user profiles
import { ConfigModule } from '@nestjs/config'; // For service_role key access

@Module({
  imports: [
    ProfileModule, // Assuming ProfilesModule exports ProfilesService if needed, or handle profile access within UserService
    ConfigModule,   // To access SERVICE_ROLE_KEY if used for Supabase User Client
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}