import { Module } from "@nestjs/common";
import { ShiftBotService } from "./shift-bot.service";

@Module({
  providers: [ShiftBotService],
  exports: [ShiftBotService],
})
export class ShiftBotModule {}
