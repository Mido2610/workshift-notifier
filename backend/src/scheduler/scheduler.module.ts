import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerService } from "./scheduler.service";
import { CalendarModule } from "../calendar/calendar.module";
import { NotificationModule } from "../notification/notification.module";
import { NotifyConfigModule } from "../notify-config/notify-config.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CalendarModule,
    NotificationModule,
    NotifyConfigModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
