import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', [
    `app_session_id=; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=-1`,
  ]);

  res.json({ success: true });
}
