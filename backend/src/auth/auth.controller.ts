import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Response } from "express";
import { randomBytes } from "crypto";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt.guard";

@Controller("api/auth")
export class AuthController {
  private readonly states = new Set<string>();

  constructor(private readonly authService: AuthService) {}

  @Get("github")
  redirectToGitHub(@Req() req: any, @Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
    const state = randomBytes(16).toString("hex");
    this.states.add(state);
    setTimeout(() => this.states.delete(state), 10 * 60 * 1000); // expire 10min

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user+user:email&state=${state}`;
    return res.redirect(url);
  }

  @Get("github/callback")
  async githubCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    if (!code || !state || !this.states.has(state)) {
      return res.status(400).send("Invalid OAuth state");
    }
    this.states.delete(state);

    try {
      const user = await this.authService.exchangeCodeForUser(code);
      const token = this.authService.signToken(user);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
      return res.redirect(`${frontendUrl}/dashboard?token=${token}`);
    } catch (err) {
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5174"}/login?error=oauth_failed`
      );
    }
  }

  @Get("dev-login")
  devLogin(@Query("login") login: string, @Res() res: Response) {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).send("Not available in production");
    }
    const user = {
      id: 0,
      login: login || "Mido2610",
      email: "dev@localhost",
      name: login || "Mido2610",
      avatar_url: "",
    };
    const token = this.authService.signToken(user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
    return res.redirect(`${frontendUrl}/dashboard?token=${token}`);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@Request() req: any) {
    return req.user;
  }
}
