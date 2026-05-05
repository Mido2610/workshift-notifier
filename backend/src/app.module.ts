import "dotenv/config";
import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CalendarModule } from "./calendar/calendar.module";
import { NotificationModule } from "./notification/notification.module";
import { NotifyConfigModule } from "./notify-config/notify-config.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { NotificationController } from "./notification/notification.controller";
import { CalendarService } from "./calendar/calendar.service";

/**
 * NotificationController cần CalendarService nên cần
 * CalendarModule được import ở AppModule level.
 */
@Module({
  imports: [
    AuthModule,
    CalendarModule,
    NotifyConfigModule,
    NotificationModule,
    SchedulerModule,
  ],
})
export class AppModule {}
