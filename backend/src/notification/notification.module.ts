import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { CalendarModule } from "../calendar/calendar.module";
import { NotifyConfigModule } from "../notify-config/notify-config.module";

@Module({
  imports: [CalendarModule, NotifyConfigModule],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
