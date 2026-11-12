import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import { account, rateLimit, session, user, verification } from "@/db/schema";
import { sendCodeEmail } from "./email";
import { isAdminEmail } from "./admin-emails";
import { GUEST_COOKIE } from "./cart/cookie";
import { mergeGuestIntoUser } from "./cart/merge";

const CODE_TTL_SECONDS = 10 * 60;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Production trusts only the site's own URL. In development any localhost port works, so the
  // dev server can run on 3000, 3002, … without editing BETTER_AUTH_URL.
  trustedOrigins: async (request) => {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.NODE_ENV !== "development") return [site];
    const origin = request?.headers.get("origin");
    const local = origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null;
    return [site, local];
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      phone: { type: "string", required: false },
      orderUpdates: { type: "boolean", required: false, defaultValue: true },
      offers: { type: "boolean", required: false, defaultValue: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // A password account only works once its email is verified, so nobody can register someone
    // else's address and wait for them.
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/email-otp/verify-email": { window: 60, max: 5 },
      "/email-otp/request-password-reset": { window: 60, max: 3 },
      "/forget-password/email-otp": { window: 60, max: 3 },
      "/email-otp/reset-password": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
    },
  },
  // Email + password only for now: the code sign-in route is switched off. Codes are used only to
  // verify an email and to reset a password.
  disabledPaths: ["/sign-in/email-otp", "/request-password-reset", "/reset-password"],
  databaseHooks: {
    user: {
      create: {
        before: async (u) => ({ data: { ...u, role: isAdminEmail(u.email) ? "admin" : "customer" } }),
      },
    },
    session: {
      create: {
        // Every way in (password sign-in, sign-in after email verification) creates a session:
        // move the guest's cart and wishlist to the account then, and clear the guest cookie.
        // A failure here must never block signing in; the sign-in forms also call claimGuestCart().
        after: async (s, ctx) => {
          try {
            const guestId = ctx?.getCookie(GUEST_COOKIE);
            if (!guestId) return;
            await mergeGuestIntoUser(guestId, s.userId);
            ctx?.setCookie(GUEST_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
          } catch (e) {
            console.error("[auth] guest cart merge failed", e);
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: CODE_TTL_SECONDS,
      allowedAttempts: 5,
      storeOTP: "hashed",
      overrideDefaultEmailVerification: true,
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendCodeEmail(email, otp, type);
      },
    }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
