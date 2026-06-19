import { z } from "zod";
import { getParticipantSession } from "@/lib/session";
import { joinQuizRun, submitQuizAnswer } from "@/lib/quiz";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  runId: z.string().uuid(),
  questionId: z.string().uuid(),
  choiceId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await getParticipantSession();
  if (!session) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const displayName =
      session.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Player";
    await joinQuizRun(parsed.data.runId, session.userId, displayName);
    const result = await submitQuizAnswer(
      parsed.data.runId,
      session.userId,
      parsed.data.questionId,
      parsed.data.choiceId,
    );
    return Response.json(
      {
        ok: result.accepted,
        alreadyAnswered: result.duplicate,
        score: result.score,
        isCorrect: result.isCorrect,
        error: result.errorCode,
      },
      {
        status: result.accepted || result.duplicate ? 200 : 409,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not submit answer.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
