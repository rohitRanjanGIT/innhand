import { GENERIC_SIGN_IN_ERROR } from "@/lib/auth-client";

export const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";
export const CODE_INVALID = "That code is wrong or has expired. Check the latest email, or send a new code.";

type AuthError = { status?: number; code?: string; message?: string } | null | undefined;

/** Turns a Better Auth client error into a message for the shopper. */
export function authMessage(error: AuthError, fallback: string) {
  if (!error) return "";
  if (error.status === 429) return RATE_LIMITED;
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return GENERIC_SIGN_IN_ERROR;
    case "INVALID_OTP":
    case "OTP_EXPIRED":
    case "TOO_MANY_ATTEMPTS":
      return CODE_INVALID;
    case "PASSWORD_TOO_SHORT":
      return "Your password needs at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "That password is too long.";
    case "INVALID_EMAIL":
      return "Please enter a valid email address.";
    case "INVALID_PASSWORD":
      return "Your current password is incorrect.";
  }
  return fallback;
}

export function withNext(path: string, params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `${path}?${q.toString()}`;
}
