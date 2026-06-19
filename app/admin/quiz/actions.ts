"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";
import {
  createQuizQuestionAdmin,
  createQuizSetAdmin,
  deleteQuizQuestionAdmin,
  endOpenRunsAdmin,
  pauseRunAdmin,
  resumeRunAdmin,
  setActiveQuizSetAdmin,
  startQuestionAdmin,
  startQuizRunAdmin,
  toggleRunLeaderboardAdmin,
  updateQuizQuestionAdmin,
  voidQuestionAdmin,
  type QuizMode,
} from "@/lib/quiz";
import { updateSettings } from "@/lib/settings";

export type QuizActionState = { ok: boolean; error?: string };

const uuidSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1, "Title is required.").max(120);
const descriptionSchema = z.string().trim().max(500).optional();
const promptSchema = z.string().trim().min(1, "Question is required.").max(300);
const choiceSchema = z.string().trim().min(1, "Choice is required.").max(120);

async function assertAdmin(): Promise<QuizActionState | null> {
  if (!(await getAdminSession())) return { ok: false, error: "unauthorized" };
  return null;
}

function refreshQuizPaths() {
  revalidatePath("/admin/quiz");
  revalidatePath("/admin/settings");
  revalidatePath("/quiz");
  revalidatePath("/quiz/live");
}

export async function createQuizSetAction(
  _prev: QuizActionState,
  formData: FormData,
): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = z
    .object({
      title: titleSchema,
      description: descriptionSchema,
    })
    .safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await createQuizSetAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}

export async function setActiveQuizSetAction(quizSetId: string): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = uuidSchema.safeParse(quizSetId);
  if (!parsed.success) return { ok: false, error: "Invalid quiz set." };

  await setActiveQuizSetAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}

export async function createQuizQuestionAction(
  _prev: QuizActionState,
  formData: FormData,
): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const correctIndex = Number(formData.get("correctIndex"));
  const choices = [1, 2, 3, 4].map((index) => ({
    label: String(formData.get(`choice${index}`) ?? ""),
    isCorrect: correctIndex === index,
  }));

  const parsed = z
    .object({
      quizSetId: uuidSchema,
      prompt: promptSchema,
      timeLimitSeconds: z.coerce.number().int().min(5).max(120),
      choices: z.array(z.object({ label: choiceSchema, isCorrect: z.boolean() })).length(4),
    })
    .refine((value) => value.choices.filter((choice) => choice.isCorrect).length === 1, {
      message: "Choose exactly one correct answer.",
    })
    .safeParse({
      quizSetId: formData.get("quizSetId"),
      prompt: formData.get("prompt"),
      timeLimitSeconds: formData.get("timeLimitSeconds"),
      choices,
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await createQuizQuestionAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}

export async function updateQuizQuestionAction(
  _prev: QuizActionState,
  formData: FormData,
): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const correctChoiceId = String(formData.get("correctChoiceId") ?? "");
  const choiceIds = formData.getAll("choiceId").map(String);
  const choices = choiceIds.map((id) => ({
    id,
    label: String(formData.get(`choiceLabel:${id}`) ?? ""),
    isCorrect: id === correctChoiceId,
  }));

  const parsed = z
    .object({
      questionId: uuidSchema,
      prompt: promptSchema,
      timeLimitSeconds: z.coerce.number().int().min(5).max(120),
      choices: z
        .array(
          z.object({
            id: uuidSchema,
            label: choiceSchema,
            isCorrect: z.boolean(),
          }),
        )
        .min(2)
        .max(6),
    })
    .refine((value) => value.choices.filter((choice) => choice.isCorrect).length === 1, {
      message: "Choose exactly one correct answer.",
    })
    .safeParse({
      questionId: formData.get("questionId"),
      prompt: formData.get("prompt"),
      timeLimitSeconds: formData.get("timeLimitSeconds"),
      choices,
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    await updateQuizQuestionAdmin(parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update question.",
    };
  }
  refreshQuizPaths();
  return { ok: true };
}

export async function deleteQuizQuestionAction(questionId: string): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = uuidSchema.safeParse(questionId);
  if (!parsed.success) return { ok: false, error: "Invalid question." };

  try {
    await deleteQuizQuestionAdmin(parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete question.",
    };
  }
  refreshQuizPaths();
  return { ok: true };
}

export async function startQuizRunAction(
  quizSetId: string,
  mode: QuizMode,
): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = z
    .object({ quizSetId: uuidSchema, mode: z.enum(["practice", "live"]) })
    .safeParse({ quizSetId, mode });
  if (!parsed.success) return { ok: false, error: "Invalid quiz run." };

  await endOpenRunsAdmin(parsed.data.quizSetId);
  await startQuizRunAdmin(parsed.data);
  await updateSettings({ quizOpen: true });
  refreshQuizPaths();
  return { ok: true };
}

export async function endQuizRunAction(quizSetId: string): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = uuidSchema.safeParse(quizSetId);
  if (!parsed.success) return { ok: false, error: "Invalid quiz set." };

  await endOpenRunsAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}

export async function setQuizOpenAction(open: boolean): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  await updateSettings({ quizOpen: open });
  refreshQuizPaths();
  return { ok: true };
}

export async function startQuestionAction(
  runId: string,
  questionId: string,
): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = z.object({ runId: uuidSchema, questionId: uuidSchema }).safeParse({
    runId,
    questionId,
  });
  if (!parsed.success) return { ok: false, error: "Invalid question." };

  await startQuestionAdmin(parsed.data.runId, parsed.data.questionId);
  refreshQuizPaths();
  return { ok: true };
}

export async function pauseRunAction(runId: string): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = uuidSchema.safeParse(runId);
  if (!parsed.success) return { ok: false, error: "Invalid quiz run." };

  await pauseRunAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}

export async function resumeRunAction(runId: string): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = uuidSchema.safeParse(runId);
  if (!parsed.success) return { ok: false, error: "Invalid quiz run." };

  await resumeRunAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}

export async function toggleLeaderboardAction(
  runId: string,
  hideLeaderboard: boolean,
): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = z
    .object({ runId: uuidSchema, hideLeaderboard: z.boolean() })
    .safeParse({ runId, hideLeaderboard });
  if (!parsed.success) return { ok: false, error: "Invalid leaderboard setting." };

  await toggleRunLeaderboardAdmin(parsed.data.runId, parsed.data.hideLeaderboard);
  refreshQuizPaths();
  return { ok: true };
}

export async function voidQuestionAction(questionId: string): Promise<QuizActionState> {
  const unauthorized = await assertAdmin();
  if (unauthorized) return unauthorized;

  const parsed = uuidSchema.safeParse(questionId);
  if (!parsed.success) return { ok: false, error: "Invalid question." };

  await voidQuestionAdmin(parsed.data);
  refreshQuizPaths();
  return { ok: true };
}
