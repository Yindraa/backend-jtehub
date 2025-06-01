import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { SchedulesModule } from 'src/schedule/schedule.module';

@Module({
  imports: [SchedulesModule], // Add SchedulesModule here
  controllers: [RoomsController],
  providers: [RoomsService], // RoomsService might also need Supabase client
})
export class RoomsModule {}