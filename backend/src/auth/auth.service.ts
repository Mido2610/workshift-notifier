import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import axios from "axios";

export interface GithubUser {
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async exchangeCodeForUser(code: string): Promise<GithubUser> {
    const tokenRes = await axios.post<{
      access_token: string;
      error?: string;
    }>(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      throw new Error("GitHub OAuth failed: no access_token");
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    const userRes = await axios.get<GithubUser>(
      "https://api.github.com/user",
      { headers }
    );

    if (!userRes.data.email) {
      const emailsRes = await axios.get<
        { email: string; primary: boolean; verified: boolean }[]
      >("https://api.github.com/user/emails", { headers });
      const primary = emailsRes.data.find((e) => e.primary && e.verified);
      userRes.data.email = (primary ?? emailsRes.data[0])?.email;
    }

    return userRes.data;
  }

  signToken(user: GithubUser): string {
    return this.jwtService.sign({
      sub: user.id,
      login: user.login,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    });
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
}
