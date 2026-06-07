"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/session";
import { emailSchema } from "@/lib/validation";
import { updateSettings, type AppSettings } from "@/lib/settings";
import {
  addWhitelistEmail,
  removeWhitelistEmail,
} from "@/lib/whitelist-admin";
import { addPhrase, removePhrase, removePhrases } from "@/lib/phrases";
import { adminSoftDeletePhoto, adminRestorePhoto } from "@/lib/photos";

export type AdminActionState = { ok: boolean; error?: string };

const photoIdSchema = z.string().uuid();
const idSchema = z.string().uuid();

const phraseSchema = z
  .string()
  .trim()
  .min(1, "Phrase can't be empty.")
  .max(60, "Phrase must be 60 characters or fewer.");

const settingsSchema = z
  .object({
    uploadOpen: z.boolean().optional(),
    votingOpen: z.boolean().optional(),
    revealResultsOpen: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update.");

/** Toggle one or more app settings. Admin only. */
export async function updateSettingsAction(
  partial: Partial<AppSettings>,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = settingsSchema.safeParse(partial);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await updateSettings(parsed.data);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Add an email to the whitelist. Admin only. */
export async function addWhitelistAction(
  email: string,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await addWhitelistEmail(parsed.data);
  revalidatePath("/admin/whitelist");
  revalidatePath("/admin");
  return { ok: true };
}

/** Remove a whitelist entry by id. Admin only. */
export async function removeWhitelistAction(
  id: string,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  await removeWhitelistEmail(parsed.data);
  revalidatePath("/admin/whitelist");
  revalidatePath("/admin");
  return { ok: true };
}

/** Add a typewriter phrase. Admin only. */
export async function addPhraseAction(
  text: string,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = phraseSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await addPhrase(parsed.data);
  revalidatePath("/admin/phrases");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Remove a typewriter phrase by id. Admin only. */
export async function removePhraseAction(
  id: string,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  await removePhrase(parsed.data);
  revalidatePath("/admin/phrases");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Remove several typewriter phrases at once. Admin only. */
export async function removePhrasesAction(
  ids: string[],
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = z.array(idSchema).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid selection." };

  await removePhrases(parsed.data);
  revalidatePath("/admin/phrases");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Soft-delete any photo. Admin only. */
export async function adminDeletePhotoAction(
  photoId: string,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "Invalid photo." };

  await adminSoftDeletePhoto(parsed.data);
  revalidatePath("/admin/photos");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Restore a soft-deleted photo. Admin only. */
export async function adminRestorePhotoAction(
  photoId: string,
): Promise<AdminActionState> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "Invalid photo." };

  await adminRestorePhoto(parsed.data);
  revalidatePath("/admin/photos");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
