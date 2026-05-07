import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as bodyParser from "body-parser";
import mongoose from "mongoose";

async function bootstrap() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/workshift-notifier";

  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected");

  const app = await NestFactory.create(AppModule, { logger: ["log", "warn", "error"] });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
  app.enableCors({
    origin: [frontendUrl, "http://localhost:5174", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.use(bodyParser.json({ limit: "5mb" }));

  // Health check for UptimeRobot / keep-alive pings
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get("/api/health", (_req: any, res: any) => res.json({ status: "ok", ts: Date.now() }));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Backend running on port ${port}`);
}

bootstrap();
