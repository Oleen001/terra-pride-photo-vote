import type { Metadata } from "next";
import { LiveQuizStage } from "@/components/quiz/live-quiz-stage";
import { getPublicQuizState } from "@/lib/quiz";

export const metadata: Metadata = {
  title: "Quiz Live · Terra Pride",
  description: "Terra Pride live quiz TV view.",
};

export const dynamic = "force-dynamic";

export default async function QuizLivePage() {
  const state = await getPublicQuizState();

  return <LiveQuizStage initialState={state} />;
}
