// src/reservations/reservations.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { RoomsModule } from 'src/rooms/rooms.module';
import { SchedulesModule } from 'src/schedule/schedule.module';
import { ReservationsController } from './reservation.controller';
import { ReservationsService } from './reservation.service';


@Module({
  imports: [
    forwardRef(() => RoomsModule), // Use forwardRef if circular dependency with RoomsModule
    forwardRef(() => SchedulesModule), // Use forwardRef if circular dependency with SchedulesModule
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}