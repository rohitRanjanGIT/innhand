"use client";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false },
        phone: { type: "string", required: false },
        orderUpdates: { type: "boolean", required: false },
        offers: { type: "boolean", required: false },
      },
    }),
  ],
});

/** One message whether the email exists or not, so the form can't be used to find accounts. */
export const GENERIC_SIGN_IN_ERROR = "Email or password is incorrect";
