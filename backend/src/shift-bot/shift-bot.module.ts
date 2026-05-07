import { Module } from "@nestjs/common";
import { ShiftBotService } from "./shift-bot.service";
import { CalendarModule } from "../calendar/calendar.module";
import { NotifyConfigModule } from "../notify-config/notify-config.module";

@Module({
  imports: [CalendarModule, NotifyConfigModule],
  providers: [ShiftBotService],
  exports: [ShiftBotService],
})
export class ShiftBotModule {}
