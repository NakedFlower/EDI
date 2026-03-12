import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import cookie from 'cookie';

const { Pool } = pg;

const ENV = {
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
};

async function authenticateRequest(req: VercelRequest) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.app_session_id || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  const secret = new TextEncoder().encode(ENV.jwtSecret);
  const { payload } = await jwtVerify(token, secret);

  const pool = new Pool({ connectionString: ENV.databaseUrl });
  const db = drizzle(pool);

  const [user] = await db.select().from(users).where(eq(users.openId, payload.openId as string));
  await pool.end();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticateRequest(req);
    res.json({
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
    console.error('[Auth] /api/auth/me failed:', error);
    res.status(401).json({ error: 'Not authenticated', user: null });
  }
}
