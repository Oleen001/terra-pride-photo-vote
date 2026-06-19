import { getParticipantSession } from "@/lib/session";
import { getPublicQuizState } from "@/lib/quiz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getParticipantSession();
    const state = await getPublicQuizState(session?.userId);
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not load quiz state.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
