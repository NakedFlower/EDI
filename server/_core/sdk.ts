import { COOKIE_NAME } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import * as db from "../db";
import { adminAuth } from "./firebase-admin";

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length).trim();
    }

    const cookies = this.parseCookies(req.headers.cookie);
    return cookies.get(COOKIE_NAME) ?? null;
  }

  async authenticateRequest(req: Request): Promise<db.User> {
    const token = this.getTokenFromRequest(req);
    if (!token) {
      throw ForbiddenError("Missing Firebase ID token");
    }

    let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (error) {
      throw ForbiddenError("Invalid Firebase ID token");
    }

    const openId = decoded.uid;
    const signedInAt = new Date();
    const provider = decoded.firebase?.sign_in_provider;
    const loginMethod =
      provider === "password" || provider === "google.com" || provider === "apple.com"
        ? provider.replace(".com", "")
        : provider ?? null;

    await db.upsertUser({
      openId,
      name: decoded.name ?? null,
      email: decoded.email ?? null,
      loginMethod,
      lastSignedIn: signedInAt,
    });

    const user = await db.getUserByOpenId(openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
