import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { SignJWT } from 'jose';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const { Pool } = pg;

const ENV = {
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || '',
  appId: process.env.EXPO_PUBLIC_APP_ID || process.env.APP_ID || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
};

const oauthClient = axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: 30000,
});

async function exchangeCodeForToken(code: string, state: string) {
  const redirectUri = Buffer.from(state, 'base64').toString('utf-8');
  const { data } = await oauthClient.post('/api/auth/exchange-token', {
    clientId: ENV.appId,
    grantType: 'authorization_code',
    code,
    redirectUri,
  });
  return data;
}

async function getUserInfo(accessToken: string) {
  const { data } = await oauthClient.get('/api/auth/user-info', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function syncUser(userInfo: any) {
  const pool = new Pool({ connectionString: ENV.databaseUrl });
  const db = drizzle(pool);

  const [user] = await db
    .insert(users)
    .values({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email || null,
      loginMethod: userInfo.loginMethod || null,
      lastSignedIn: new Date(),
    })
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        name: userInfo.name || null,
        email: userInfo.email || null,
        loginMethod: userInfo.loginMethod || null,
        lastSignedIn: new Date(),
      },
    })
    .returning();

  await pool.end();
  return user;
}

async function createSessionToken(openId: string, name: string) {
  const secret = new TextEncoder().encode(ENV.jwtSecret);
  const token = await new SignJWT({ openId, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(secret);
  return token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code || !state) {
    return res.status(400).json({ error: 'code and state are required' });
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code, state);
    const userInfo = await getUserInfo(tokenResponse.accessToken);
    const user = await syncUser(userInfo);

    const sessionToken = await createSessionToken(userInfo.openId, userInfo.name || '');

    // Set cookie
    const isSecure = req.headers['x-forwarded-proto'] === 'https';
    res.setHeader('Set-Cookie', [
      `app_session_id=${sessionToken}; HttpOnly; Path=/; SameSite=None; Secure=${isSecure}; Max-Age=${365 * 24 * 60 * 60}`,
    ]);

    res.json({
      app_session_id: sessionToken,
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        lastSignedIn: user.lastSignedIn.toISOString(),
      },
    });
  } catch (error) {
    console.error('[OAuth] Mobile exchange failed', error);
    res.status(500).json({ error: 'OAuth mobile exchange failed' });
  }
}
