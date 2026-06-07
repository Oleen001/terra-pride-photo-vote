"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getParticipantSession } from "@/lib/session";
import { addPhrase } from "@/lib/phrases";

export type SubmitPhraseState = { ok: boolean; error?: string };

const phraseSchema = z
  .string()
  .trim()
  .min(1, "Type something first 🙂")
  .max(60, "Keep it under 60 characters.");

/**
 * Participant-facing: add your own phrase to the typewriter wall. Logged-in
 * only. Publishes straight into the shared pool — the graph view shuffles it
 * in on its next load. Admins can prune the wall later.
 */
export async function submitPhraseAction(text: string): Promise<SubmitPhraseState> {
  const session = await getParticipantSession();
  if (!session) return { ok: false, error: "Please sign in to add a phrase." };

  const parsed = phraseSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await addPhrase(parsed.data);
  } catch {
    return { ok: false, error: "Couldn't add that right now. Try again." };
  }

  revalidatePath("/");
  return { ok: true };
}
