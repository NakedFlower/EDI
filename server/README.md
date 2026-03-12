# Server (Firebase-only)

This backend is now standardized on **Firebase-only infrastructure**:

- Auth: Firebase Authentication (ID token)
- Data: Cloud Firestore (Admin SDK)
- API: Express + tRPC (`/api/trpc`)

## Runtime Entry

- `server/_core/index.ts`: Express boot + tRPC middleware + auth routes

## Auth Flow

Routes in `server/_core/oauth.ts`:

- `GET /api/auth/me`
- `POST /api/auth/session`
- `POST /api/auth/logout`

Auth verification is handled in `server/_core/sdk.ts` using Firebase Admin `verifyIdToken()`.

## Data Layer

- `server/db.ts` contains Firestore-based query helpers.
- Numeric IDs are generated through `_meta/counters` transaction increments.

## Required Environment Variables

### Server

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
OWNER_OPEN_ID=...   # optional admin uid mapping
```

### Client (Expo public)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Local Dev

```bash
pnpm install
pnpm dev
```
