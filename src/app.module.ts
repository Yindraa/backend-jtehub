import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.contoller';
import { AuthService } from './auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { ProfileController} from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { ScheduleController } from './schedule/schedule.controller';
import { ScheduleService } from './schedule/schedule.service';
import { RoomsController } from './rooms/rooms.controller';
import { RoomsService } from './rooms/rooms.service';
import { Room } from './entities';
import { commentsService } from './auth/comment/comment.service';
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SUPABASE_JWT_SECRET,
})],
  controllers: [AppController, AuthController, ProfileController, ScheduleController, RoomsController],
  providers: [AppService, AuthService, JwtStrategy, ProfileService, ScheduleService, RoomsService, commentsService],
})
export class AppModule {}
