import { Module } from "@nestjs/common";
import { NotifyConfigService } from "./notify-config.service";
import { NotifyConfigController } from "./notify-config.controller";

@Module({
  providers: [NotifyConfigService],
  controllers: [NotifyConfigController],
  exports: [NotifyConfigService],
})
export class NotifyConfigModule {}
