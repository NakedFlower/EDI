import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

function buildOAuthStartUrl(req: Request, provider?: string): string {
  if (!ENV.oAuthPortalUrl || !ENV.appId) {
    throw new Error("Missing OAuth config: VITE_OAUTH_PORTAL_URL/EXPO_PUBLIC_OAUTH_PORTAL_URL or VITE_APP_ID/EXPO_PUBLIC_APP_ID");
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  const redirectUri = `${origin}/api/oauth/callback`;
  const state = Buffer.from(redirectUri, "utf-8").toString("base64");

  const url = new URL(`${ENV.oAuthPortalUrl}/app-auth`);
  url.searchParams.set("appId", ENV.appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  if (provider) {
    url.searchParams.set("provider", provider);
  }
  return url.toString();
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    try {
      const provider = getQueryParam(req, "provider");
      const loginUrl = buildOAuthStartUrl(req, provider);
      res.redirect(302, loginUrl);
    } catch (error) {
      console.error("[OAuth] Start failed", error);
      res.status(500).json({ error: "OAuth start failed" });
    }
  });

  // Web OAuth callback - redirects to frontend with cookie
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the frontend URL (Expo web on port 8081)
      // Cookie is set with parent domain so it works across both 3000 and 8081 subdomains
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Native (Expo Go) OAuth callback - exchanges code, then redirects to exp:// deep link
  // This is used when Expo Go can't use custom schemes (manus*) for redirect_uri
  // The flow: OAuth portal -> this HTTPS endpoint -> exchange token -> redirect to exp:// with token
  app.get("/api/oauth/native-callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2>인증 오류</h2>
          <p>필수 파라미터가 누락되었습니다.</p>
        </body></html>
      `);
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Encode user info as base64 for URL safety
      const userPayload = Buffer.from(JSON.stringify(buildUserResponse(user))).toString("base64");

      // Build the Expo Go deep link URL
      // In Expo Go, the URL format is: exp://HOST:PORT/--/path?params
      // We use the Metro bundler URL from environment
      const metroUrl = process.env.EXPO_PACKAGER_PROXY_URL || process.env.EXPO_WEB_PREVIEW_URL || "";
      
      let deepLink: string;
      if (metroUrl) {
        // Extract host from metro URL (e.g., "https://8081-xxx.domain" -> "8081-xxx.domain")
        try {
          const metroUrlObj = new URL(metroUrl);
          deepLink = `exp://${metroUrlObj.host}/--/oauth/callback?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userPayload)}`;
        } catch {
          // Fallback: use exp:// with just the path
          deepLink = `exp://127.0.0.1:8081/--/oauth/callback?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userPayload)}`;
        }
      } else {
        deepLink = `exp://127.0.0.1:8081/--/oauth/callback?sessionToken=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(userPayload)}`;
      }

      console.log("[OAuth] Native callback - redirecting to deep link:", deepLink.substring(0, 100) + "...");

      // Send an HTML page that redirects to the deep link
      // Using HTML redirect because some browsers block direct 302 to custom schemes
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>인증 완료</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 60px 20px; background: #f5f5f5; }
            .card { background: white; border-radius: 16px; padding: 32px; max-width: 360px; margin: 0 auto; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
            h2 { color: #1a1a1a; margin-bottom: 8px; }
            p { color: #666; line-height: 1.5; }
            .btn { display: inline-block; background: #6C5CE7; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>인증 완료!</h2>
            <p>앱으로 돌아가는 중입니다...</p>
            <a class="btn" href="${deepLink}">앱으로 돌아가기</a>
            <p style="font-size:12px;color:#999;margin-top:16px;">자동으로 이동하지 않으면 위 버튼을 눌러주세요.</p>
          </div>
          <script>
            // Try to redirect automatically
            setTimeout(function() {
              window.location.href = "${deepLink}";
            }, 500);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("[OAuth] Native callback failed", error);
      res.status(500).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2>인증 실패</h2>
          <p>다시 시도해주세요.</p>
          <p style="color:#999;font-size:12px;">${error instanceof Error ? error.message : "Unknown error"}</p>
        </body></html>
      `);
    }
  });

  // Mobile OAuth - returns JSON with session token (for standalone apps)
  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
