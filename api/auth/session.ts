import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const { Pool } = pg;

const ENV = {
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Bearer token required' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const secret = new TextEncoder().encode(ENV.jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    const pool = new Pool({ connectionString: ENV.databaseUrl });
    const db = drizzle(pool);

    const [user] = await db.select().from(users).where(eq(users.openId, payload.openId as string));
    await pool.end();

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set cookie
    const isSecure = req.headers['x-forwarded-proto'] === 'https';
    res.setHeader('Set-Cookie', [
      `app_session_id=${token}; HttpOnly; Path=/; SameSite=None; Secure=${isSecure}; Max-Age=${365 * 24 * 60 * 60}`,
    ]);

    res.json({
      success: true,
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
    console.error('[Auth] /api/auth/session failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}
