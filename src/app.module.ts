import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketController, StockController } from './stock/stock.controller';
import { StockService } from './stock/stock.service';
import { AuthController } from './auth/auth.contoller';
import { AuthService } from './auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { StockBatchController } from './stock_batch/batch.controller';
import { StockBatchService } from './stock_batch/batch.service';
import { StockMovementService } from './stock_movement/movement.service';
import { StockMovementController } from './stock_movement/movement.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { ProfileController} from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { AnnouncementController } from './announcement/announcement.controller';
import { AnnouncementService } from './announcement/announcement.service';
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SUPABASE_JWT_SECRET,
})],
  controllers: [AppController, StockController, AuthController, StockBatchController, StockMovementController, DashboardController, ProfileController, MarketController, AnnouncementController],
  providers: [AppService, StockService, AuthService, JwtStrategy, StockBatchService, StockMovementService, DashboardService, ProfileService, AnnouncementService],
})
export class AppModule {}
