import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Innhand Creations <hello@example.com>";

export type CodePurpose = "email-verification" | "forget-password" | "sign-in" | "change-email";

const subjects: Record<CodePurpose, string> = {
  "email-verification": "Your Innhand verification code",
  "forget-password": "Your Innhand password reset code",
  "sign-in": "Your Innhand sign-in code",
  "change-email": "Confirm your new Innhand email",
};

const intros: Record<CodePurpose, string> = {
  "email-verification": "Enter this code to verify your email and finish creating your account.",
  "forget-password": "Enter this code to choose a new password.",
  "sign-in": "Enter this code to sign in.",
  "change-email": "Enter this code to confirm your new email address.",
};

/** Sends a 6-digit code. Without RESEND_API_KEY the code is printed to the terminal instead. */
export async function sendCodeEmail(to: string, code: string, purpose: CodePurpose) {
  if (!resend) {
    console.info(`\n[email] ${purpose} code for ${to}: ${code}\n`);
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: subjects[purpose],
    text: `${intros[purpose]}\n\n${code}\n\nThe code expires in 10 minutes. If you didn't ask for it, you can ignore this email.\n\nInnhand Creations`,
    html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#2A2238;max-width:480px">
<p>${intros[purpose]}</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:600;margin:24px 0">${code}</p>
<p style="color:#6b6478;font-size:14px">The code expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
<p style="color:#6b6478;font-size:14px">Innhand Creations</p></div>`,
  });
  if (error) console.error("[email] Resend error", error);
}
