import { Module } from "@nestjs/common";
import { ShiftBotService } from "./shift-bot.service";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [NotificationModule],
  providers: [ShiftBotService],
  exports: [ShiftBotService],
})
export class ShiftBotModule {}
