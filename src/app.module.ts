import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.contoller';
import { AuthService } from './auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { ProfileController} from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SUPABASE_JWT_SECRET,
})],
  controllers: [AppController, AuthController, ProfileController],
  providers: [AppService, AuthService, JwtStrategy, ProfileService],
})
export class AppModule {}
