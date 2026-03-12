import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { EXPO_PUBLIC_OAUTH_PORTAL_URL, EXPO_PUBLIC_APP_ID } = process.env;
  
  if (!EXPO_PUBLIC_OAUTH_PORTAL_URL || !EXPO_PUBLIC_APP_ID) {
    return res.status(500).json({ error: 'Missing OAuth config' });
  }

  const provider = req.query.provider as string | undefined;
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const redirectUri = `${origin}/oauth/callback`;
  const state = Buffer.from(redirectUri, 'utf-8').toString('base64');

  const url = new URL(`${EXPO_PUBLIC_OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set('appId', EXPO_PUBLIC_APP_ID);
  url.searchParams.set('redirectUri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('type', 'signIn');
  if (provider) {
    url.searchParams.set('provider', provider);
  }

  res.redirect(302, url.toString());
}
