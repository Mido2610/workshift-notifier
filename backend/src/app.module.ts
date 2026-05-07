import "dotenv/config";
import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CalendarModule } from "./calendar/calendar.module";
import { NotificationModule } from "./notification/notification.module";
import { NotifyConfigModule } from "./notify-config/notify-config.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { ShiftBotModule } from "./shift-bot/shift-bot.module";
import { SystemConfigModule } from "./system-config/system-config.module";

@Module({
  imports: [
    AuthModule,
    CalendarModule,
    NotifyConfigModule,
    NotificationModule,
    SchedulerModule,
    ShiftBotModule,
    SystemConfigModule,
  ],
})
export class AppModule {}
