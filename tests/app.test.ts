import { describe, it, expect } from "vitest";

describe("Firebase Cleanup Regression", () => {
  it("uses Firebase SDK on client and server", async () => {
    const fs = await import("fs");
    const client = fs.readFileSync("lib/firebase.ts", "utf-8");
    const admin = fs.readFileSync("server/_core/firebase-admin.ts", "utf-8");

    expect(client).toContain("firebase/app");
    expect(client).toContain("firebase/auth");
    expect(admin).toContain("firebase-admin/app");
    expect(admin).toContain("firebase-admin/firestore");
  });

  it("keeps auth endpoints in express backend", async () => {
    const fs = await import("fs");
    const authRoutes = fs.readFileSync("server/_core/oauth.ts", "utf-8");

    expect(authRoutes).toContain('/api/auth/me');
    expect(authRoutes).toContain('/api/auth/session');
    expect(authRoutes).toContain('/api/auth/logout');
  });

  it("removed legacy Vercel API folder and Drizzle schema", async () => {
    const fs = await import("fs");
    expect(fs.existsSync("api")).toBe(false);
    expect(fs.existsSync("drizzle")).toBe(false);
    expect(fs.existsSync("drizzle.config.ts")).toBe(false);
  });

  it("login screen uses Firebase auth flows", async () => {
    const fs = await import("fs");
    const login = fs.readFileSync("app/login.tsx", "utf-8");
    expect(login).toContain("signInWithEmailAndPassword");
    expect(login).toContain("signInWithPopup");
    expect(login).toContain("GoogleAuthProvider");
  });
});
