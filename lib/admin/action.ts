import "server-only";
import type { z } from "zod";
import { requireAdmin } from "@/lib/session";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Thrown inside an action to return a friendly error to the form. */
export class ActionError extends Error {}

/**
 * Wraps an admin Server Action: checks the admin session first, validates input with Zod, and turns
 * thrown ActionErrors into `{ ok: false, error }`. Use inside a "use server" file:
 *
 *   export const saveTag = adminAction(tagSchema, async (input) => { … return id; });
 */
export function adminAction<S extends z.ZodType, R>(schema: S, fn: (input: z.infer<S>) => Promise<R>) {
  return async (raw: z.input<S>): Promise<ActionResult<R>> => {
    await requireAdmin();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form", fieldErrors };
    }
    try {
      return { ok: true, data: await fn(parsed.data) };
    } catch (e) {
      if (e instanceof ActionError) return { ok: false, error: e.message };
      // Postgres unique violation
      // (Drizzle wraps the driver error in DrizzleQueryError, with the Postgres code on `cause`.)
      const pg = (e as { cause?: { code?: string }; code?: string } | null) ?? {};
      if (pg.code === "23505" || pg.cause?.code === "23505") {
        return { ok: false, error: "That name or slug is already used." };
      }
      throw e;
    }
  };
}
