import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type QuizRunMode = "live" | "practice";
export type QuizMode = QuizRunMode;
export type QuizRunState =
  | "closed"
  | "lobby"
  | "question_active"
  | "paused"
  | "question_ended"
  | "ended";

export type QuizSet = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdByAdminEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuizQuestion = {
  id: string;
  quizSetId: string;
  position: number;
  prompt: string;
  explanation: string | null;
  timeLimitSeconds: number;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuizChoice = {
  id: string;
  questionId: string;
  position: number;
  label: string;
  isCorrect: boolean;
  createdAt: string;
};

export type QuizQuestionWithChoices = QuizQuestion & {
  choices: QuizChoice[];
};

export type QuizRun = {
  id: string;
  quizSetId: string;
  mode: QuizRunMode;
  state: QuizRunState;
  joinCode: string | null;
  currentQuestionId: string | null;
  currentQuestionStartedAt: string | null;
  currentQuestionEndsAt: string | null;
  answerRevealedAt: string | null;
  hideLeaderboard: boolean;
  pausedAt: string | null;
  stateBeforePause: QuizRunState | null;
  createdByAdminEmail: string | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export type QuizParticipant = {
  id: string;
  runId: string;
  userId: string;
  displayName: string;
  joinedAt: string;
  lastSeenAt: string;
  leftAt: string | null;
};

export type SubmitQuizAnswerResult = {
  accepted: boolean;
  duplicate: boolean;
  answerId: string | null;
  isCorrect: boolean;
  score: number;
  answeredAt: string | null;
  errorCode: string | null;
};

export type QuizLeaderboardRow = {
  place: number;
  participantId: string;
  userId: string;
  displayName: string;
  totalScore: number;
  correctCount: number;
  answerCount: number;
  lastAnsweredAt: string | null;
};

export type QuizLeaderboard = {
  hidden: boolean;
  rows: QuizLeaderboardRow[];
};

export type AdminQuizSet = QuizSet & {
  questionCount: number;
};

export type AdminQuizRun = Omit<QuizRun, "state"> & {
  state: "lobby" | "question_active" | "paused" | "question_ended" | "ended";
};

export type AdminQuizQuestion = QuizQuestion & {
  sortOrder: number;
  voidedAt: string | null;
  choices: QuizChoice[];
};

export type AdminQuizLeaderboardRow = Omit<QuizLeaderboardRow, "place"> & {
  rank: number;
};

export type PublicQuizParticipant = {
  id: string;
  displayName: string;
  joinedAt: string;
  lastSeenAt: string;
  answeredCurrentQuestion: boolean;
  selectedChoiceId: string | null;
  selectedChoiceLabel: string | null;
  selectedChoicePosition: number | null;
  currentScore: number | null;
  currentIsCorrect: boolean | null;
};

type QuizSetRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_by_admin_email: string | null;
  created_at: string;
  updated_at: string;
};

type QuizQuestionRow = {
  id: string;
  quiz_set_id: string;
  position: number;
  prompt: string;
  explanation: string | null;
  time_limit_seconds: number;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type QuizChoiceRow = {
  id: string;
  question_id: string;
  position: number;
  label: string;
  is_correct: boolean;
  created_at: string;
};

type QuizRunRow = {
  id: string;
  quiz_set_id: string;
  mode: QuizRunMode;
  state: QuizRunState;
  join_code: string | null;
  current_question_id: string | null;
  current_question_started_at: string | null;
  current_question_ends_at: string | null;
  answer_revealed_at: string | null;
  hide_leaderboard: boolean;
  paused_at: string | null;
  state_before_pause: QuizRunState | null;
  created_by_admin_email: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
};

type QuizParticipantRow = {
  id: string;
  run_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
};

type SubmitQuizAnswerResultRow = {
  accepted: boolean;
  duplicate: boolean;
  answer_id: string | null;
  is_correct: boolean;
  score: number;
  answered_at: string | null;
  error_code: string | null;
};

type QuizLeaderboardRowRaw = {
  place: number;
  participant_id: string;
  user_id: string;
  display_name: string;
  total_score: number;
  correct_count: number;
  answer_count: number;
  last_answered_at: string | null;
};

function mapQuizSet(row: QuizSetRow): QuizSet {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    isActive: row.is_active,
    createdByAdminEmail: row.created_by_admin_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return {
    id: row.id,
    quizSetId: row.quiz_set_id,
    position: row.position,
    prompt: row.prompt,
    explanation: row.explanation,
    timeLimitSeconds: row.time_limit_seconds,
    points: row.points,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuizChoice(row: QuizChoiceRow): QuizChoice {
  return {
    id: row.id,
    questionId: row.question_id,
    position: row.position,
    label: row.label,
    isCorrect: row.is_correct,
    createdAt: row.created_at,
  };
}

function mapQuizRun(row: QuizRunRow): QuizRun {
  return {
    id: row.id,
    quizSetId: row.quiz_set_id,
    mode: row.mode,
    state: row.state,
    joinCode: row.join_code,
    currentQuestionId: row.current_question_id,
    currentQuestionStartedAt: row.current_question_started_at,
    currentQuestionEndsAt: row.current_question_ends_at,
    answerRevealedAt: row.answer_revealed_at,
    hideLeaderboard: row.hide_leaderboard,
    pausedAt: row.paused_at,
    stateBeforePause: row.state_before_pause,
    createdByAdminEmail: row.created_by_admin_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at,
  };
}

function mapQuizParticipant(row: QuizParticipantRow): QuizParticipant {
  return {
    id: row.id,
    runId: row.run_id,
    userId: row.user_id,
    displayName: row.display_name,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    leftAt: row.left_at,
  };
}

function mapSubmitResult(row: SubmitQuizAnswerResultRow): SubmitQuizAnswerResult {
  return {
    accepted: row.accepted,
    duplicate: row.duplicate,
    answerId: row.answer_id,
    isCorrect: row.is_correct,
    score: row.score,
    answeredAt: row.answered_at,
    errorCode: row.error_code,
  };
}

function mapLeaderboardRow(row: QuizLeaderboardRowRaw): QuizLeaderboardRow {
  return {
    place: row.place,
    participantId: row.participant_id,
    userId: row.user_id,
    displayName: row.display_name,
    totalScore: row.total_score,
    correctCount: row.correct_count,
    answerCount: row.answer_count,
    lastAnsweredAt: row.last_answered_at,
  };
}

export async function listQuizSets(): Promise<QuizSet[]> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_sets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuizSetRow[]).map(mapQuizSet);
}

export async function getActiveQuizSet(): Promise<QuizSet | null> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_sets")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuizSet(data as QuizSetRow) : null;
}

export type CreateQuizSetInput = {
  slug: string;
  title: string;
  description?: string | null;
  createdByAdminEmail?: string | null;
  isActive?: boolean;
};

export async function createQuizSet(input: CreateQuizSetInput): Promise<QuizSet> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("quiz_sets")
    .insert({
      slug: input.slug.trim(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      created_by_admin_email: input.createdByAdminEmail ?? null,
      is_active: false,
    })
    .select("*")
    .single();
  if (error) throw error;

  const quizSet = mapQuizSet(data as QuizSetRow);
  if (!input.isActive) return quizSet;
  return (await setActiveQuizSet(quizSet.id)) ?? quizSet;
}

export async function setActiveQuizSet(quizSetId: string | null): Promise<QuizSet | null> {
  const { data, error } = await supabaseAdmin().rpc("set_active_quiz_set", {
    p_quiz_set_id: quizSetId,
  });
  if (error) throw error;
  return data ? mapQuizSet(data as QuizSetRow) : null;
}

export async function listQuizQuestions(
  quizSetId: string,
): Promise<QuizQuestionWithChoices[]> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_questions")
    .select("*, quiz_choices(*)")
    .eq("quiz_set_id", quizSetId)
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (error) throw error;

  type QuestionJoin = QuizQuestionRow & { quiz_choices: QuizChoiceRow[] | null };
  return (data as unknown as QuestionJoin[]).map((row) => ({
    ...mapQuizQuestion(row),
    choices: (row.quiz_choices ?? [])
      .map(mapQuizChoice)
      .sort((a, b) => a.position - b.position),
  }));
}

export type CreateQuizRunInput = {
  quizSetId: string;
  mode: QuizRunMode;
  joinCode?: string | null;
  hideLeaderboard?: boolean;
  createdByAdminEmail?: string | null;
};

export async function createQuizRun(input: CreateQuizRunInput): Promise<QuizRun> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_runs")
    .insert({
      quiz_set_id: input.quizSetId,
      mode: input.mode,
      join_code: input.joinCode?.trim() || null,
      hide_leaderboard: input.hideLeaderboard ?? false,
      created_by_admin_email: input.createdByAdminEmail ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function getQuizRun(runId: string): Promise<QuizRun | null> {
  const { data, error } = await supabaseAdmin().rpc("sync_quiz_run_timeout", {
    p_run_id: runId,
  });
  if (error) throw error;
  return data ? mapQuizRun(data as QuizRunRow) : null;
}

export async function getQuizRunByJoinCode(joinCode: string): Promise<QuizRun | null> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_runs")
    .select("*")
    .eq("join_code", joinCode.trim())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return getQuizRun((data as QuizRunRow).id);
}

export async function setQuizRunLobby(runId: string): Promise<QuizRun> {
  return setQuizRunTerminalState(runId, "lobby");
}

export async function closeQuizRun(runId: string): Promise<QuizRun> {
  return setQuizRunTerminalState(runId, "closed");
}

export async function endQuizRun(runId: string): Promise<QuizRun> {
  return setQuizRunTerminalState(runId, "ended");
}

async function setQuizRunTerminalState(
  runId: string,
  state: "closed" | "lobby" | "ended",
): Promise<QuizRun> {
  const patch: Record<string, string | null> = {
    state,
    paused_at: null,
    state_before_pause: null,
  };
  if (state === "ended") patch.ended_at = new Date().toISOString();
  if (state === "closed" || state === "lobby") patch.ended_at = null;

  const { data, error } = await supabaseAdmin()
    .from("quiz_runs")
    .update(patch)
    .eq("id", runId)
    .select("*")
    .single();
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function setQuizRunLeaderboardHidden(
  runId: string,
  hidden: boolean,
): Promise<QuizRun> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_runs")
    .update({ hide_leaderboard: hidden })
    .eq("id", runId)
    .select("*")
    .single();
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function startQuizQuestion(
  runId: string,
  questionId: string,
): Promise<QuizRun> {
  const { data, error } = await supabaseAdmin().rpc("start_quiz_question", {
    p_run_id: runId,
    p_question_id: questionId,
  });
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function endQuizQuestion(runId: string): Promise<QuizRun> {
  const { data, error } = await supabaseAdmin().rpc("end_quiz_question", {
    p_run_id: runId,
  });
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function pauseQuizRun(runId: string): Promise<QuizRun> {
  const { data, error } = await supabaseAdmin().rpc("pause_quiz_run", {
    p_run_id: runId,
  });
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function resumeQuizRun(runId: string): Promise<QuizRun> {
  const { data, error } = await supabaseAdmin().rpc("resume_quiz_run", {
    p_run_id: runId,
  });
  if (error) throw error;
  return mapQuizRun(data as QuizRunRow);
}

export async function joinQuizRun(
  runId: string,
  userId: string,
  displayName: string,
): Promise<QuizParticipant> {
  const run = await getQuizRun(runId);
  if (!run) throw new Error("quiz_run_not_found");
  if (run.state === "closed" || run.state === "ended") {
    throw new Error("quiz_run_not_joinable");
  }

  const cleanDisplayName = displayName.trim();
  if (!cleanDisplayName) throw new Error("display_name_required");

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("quiz_run_participants")
    .upsert(
      {
        run_id: runId,
        user_id: userId,
        display_name: cleanDisplayName,
        last_seen_at: now,
        left_at: null,
      },
      { onConflict: "run_id,user_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return mapQuizParticipant(data as QuizParticipantRow);
}

export async function submitQuizAnswer(
  runId: string,
  userId: string,
  questionId: string,
  choiceId: string,
): Promise<SubmitQuizAnswerResult> {
  const { data, error } = await supabaseAdmin().rpc("submit_quiz_answer", {
    p_run_id: runId,
    p_user_id: userId,
    p_question_id: questionId,
    p_choice_id: choiceId,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      accepted: false,
      duplicate: false,
      answerId: null,
      isCorrect: false,
      score: 0,
      answeredAt: null,
      errorCode: "empty_result",
    };
  }
  return mapSubmitResult(row as SubmitQuizAnswerResultRow);
}

export async function voidQuizQuestion(
  runId: string,
  questionId: string,
  input?: { reason?: string | null; adminEmail?: string | null },
): Promise<void> {
  const { error } = await supabaseAdmin().rpc("void_quiz_question", {
    p_run_id: runId,
    p_question_id: questionId,
    p_reason: input?.reason ?? null,
    p_admin_email: input?.adminEmail ?? null,
  });
  if (error) throw error;
}

export async function getQuizLeaderboard(
  runId: string,
  opts: { includeHidden?: boolean } = {},
): Promise<QuizLeaderboard> {
  const run = await getQuizRun(runId);
  if (!run) throw new Error("quiz_run_not_found");
  if (run.hideLeaderboard && !opts.includeHidden) {
    return { hidden: true, rows: [] };
  }

  const { data, error } = await supabaseAdmin().rpc("get_quiz_leaderboard", {
    p_run_id: runId,
  });
  if (error) throw error;
  return {
    hidden: run.hideLeaderboard,
    rows: ((data ?? []) as QuizLeaderboardRowRaw[]).map(mapLeaderboardRow),
  };
}

export async function listQuizSetsAdmin(): Promise<AdminQuizSet[]> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_sets")
    .select("*, quiz_questions(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  type QuizSetJoin = QuizSetRow & { quiz_questions: { count: number }[] | null };
  return (data as unknown as QuizSetJoin[]).map((row) => ({
    ...mapQuizSet(row),
    questionCount: row.quiz_questions?.[0]?.count ?? 0,
  }));
}

export async function getLatestActiveRun(
  quizSetId: string,
): Promise<AdminQuizRun | null> {
  const { data, error } = await supabaseAdmin()
    .from("quiz_runs")
    .select("*")
    .eq("quiz_set_id", quizSetId)
    .in("state", ["lobby", "question_active", "paused", "question_ended"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const run = await getQuizRun((data as QuizRunRow).id);
  if (!run || run.state === "closed") return null;
  return run as AdminQuizRun;
}

export async function getQuizSetQuestions(
  quizSetId: string,
): Promise<AdminQuizQuestion[]> {
  const [questions, run] = await Promise.all([
    listQuizQuestions(quizSetId),
    getLatestActiveRun(quizSetId),
  ]);

  let voidedByQuestion = new Map<string, string>();
  if (run) {
    const { data, error } = await supabaseAdmin()
      .from("quiz_voided_questions")
      .select("question_id, voided_at")
      .eq("run_id", run.id);
    if (error) throw error;
    voidedByQuestion = new Map(
      ((data ?? []) as { question_id: string; voided_at: string }[]).map((row) => [
        row.question_id,
        row.voided_at,
      ]),
    );
  }

  return questions.map((question) => ({
    ...question,
    sortOrder: question.position,
    voidedAt: voidedByQuestion.get(question.id) ?? null,
  }));
}

export async function listLeaderboard(
  runId: string,
): Promise<AdminQuizLeaderboardRow[]> {
  const leaderboard = await getQuizLeaderboard(runId, { includeHidden: true });
  return leaderboard.rows.map(({ place, ...row }) => ({ ...row, rank: place }));
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "quiz"}-${Date.now().toString(36)}`;
}

function makeJoinCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createQuizSetAdmin(input: {
  title: string;
  description?: string;
}): Promise<QuizSet> {
  return createQuizSet({
    slug: slugifyTitle(input.title),
    title: input.title,
    description: input.description ?? null,
  });
}

export async function setActiveQuizSetAdmin(quizSetId: string): Promise<QuizSet | null> {
  return setActiveQuizSet(quizSetId);
}

export async function createQuizQuestionAdmin(input: {
  quizSetId: string;
  prompt: string;
  timeLimitSeconds: number;
  choices: { label: string; isCorrect: boolean }[];
}): Promise<QuizQuestionWithChoices> {
  const db = supabaseAdmin();
  const { data: lastQuestion, error: positionError } = await db
    .from("quiz_questions")
    .select("position")
    .eq("quiz_set_id", input.quizSetId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw positionError;

  const nextPosition = ((lastQuestion as { position: number } | null)?.position ?? 0) + 1;
  const { data: questionData, error: questionError } = await db
    .from("quiz_questions")
    .insert({
      quiz_set_id: input.quizSetId,
      position: nextPosition,
      prompt: input.prompt.trim(),
      time_limit_seconds: input.timeLimitSeconds,
    })
    .select("*")
    .single();
  if (questionError) throw questionError;

  const question = mapQuizQuestion(questionData as QuizQuestionRow);
  const choiceRows = input.choices.map((choice, index) => ({
    question_id: question.id,
    position: index + 1,
    label: choice.label.trim(),
    is_correct: choice.isCorrect,
  }));

  const { data: choicesData, error: choicesError } = await db
    .from("quiz_choices")
    .insert(choiceRows)
    .select("*");
  if (choicesError) {
    await db.from("quiz_questions").delete().eq("id", question.id);
    throw choicesError;
  }

  return {
    ...question,
    choices: ((choicesData ?? []) as QuizChoiceRow[])
      .map(mapQuizChoice)
      .sort((a, b) => a.position - b.position),
  };
}

export async function updateQuizQuestionAdmin(input: {
  questionId: string;
  prompt: string;
  timeLimitSeconds: number;
  choices: { id: string; label: string; isCorrect: boolean }[];
}): Promise<void> {
  const db = supabaseAdmin();
  const { count, error: countError } = await db
    .from("quiz_answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", input.questionId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("This question already has answers. Void it instead of editing.");
  }

  const { error: questionError } = await db
    .from("quiz_questions")
    .update({
      prompt: input.prompt.trim(),
      time_limit_seconds: input.timeLimitSeconds,
    })
    .eq("id", input.questionId);
  if (questionError) throw questionError;

  for (const choice of input.choices) {
    const { error } = await db
      .from("quiz_choices")
      .update({
        label: choice.label.trim(),
        is_correct: false,
      })
      .eq("id", choice.id)
      .eq("question_id", input.questionId);
    if (error) throw error;
  }

  const correctChoice = input.choices.find((choice) => choice.isCorrect);
  if (!correctChoice) throw new Error("Choose exactly one correct answer.");
  const { error: correctError } = await db
    .from("quiz_choices")
    .update({ is_correct: true })
    .eq("id", correctChoice.id)
    .eq("question_id", input.questionId);
  if (correctError) throw correctError;
}

export async function deleteQuizQuestionAdmin(questionId: string): Promise<void> {
  const db = supabaseAdmin();
  const { count, error: countError } = await db
    .from("quiz_answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("This question already has answers. Void it instead of deleting.");
  }

  const { error } = await db.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw error;
}

export async function startQuizRunAdmin(input: {
  quizSetId: string;
  mode: QuizRunMode;
}): Promise<QuizRun> {
  const run = await createQuizRun({
    quizSetId: input.quizSetId,
    mode: input.mode,
    joinCode: input.mode === "live" ? makeJoinCode() : null,
  });
  return setQuizRunLobby(run.id);
}

export async function endOpenRunsAdmin(quizSetId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("quiz_runs")
    .update({
      state: "ended",
      ended_at: now,
      paused_at: null,
      state_before_pause: null,
    })
    .eq("quiz_set_id", quizSetId)
    .neq("state", "ended");
  if (error) throw error;
}

export async function startQuestionAdmin(
  runId: string,
  questionId: string,
): Promise<QuizRun> {
  return startQuizQuestion(runId, questionId);
}

export async function pauseRunAdmin(runId: string): Promise<QuizRun> {
  return pauseQuizRun(runId);
}

export async function resumeRunAdmin(runId: string): Promise<QuizRun> {
  return resumeQuizRun(runId);
}

export async function toggleRunLeaderboardAdmin(
  runId: string,
  hideLeaderboard: boolean,
): Promise<QuizRun> {
  return setQuizRunLeaderboardHidden(runId, hideLeaderboard);
}

export async function voidQuestionAdmin(questionId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: question, error: questionError } = await db
    .from("quiz_questions")
    .select("quiz_set_id")
    .eq("id", questionId)
    .single();
  if (questionError) throw questionError;

  const { data: runs, error: runsError } = await db
    .from("quiz_runs")
    .select("id")
    .eq("quiz_set_id", (question as { quiz_set_id: string }).quiz_set_id)
    .neq("state", "ended");
  if (runsError) throw runsError;

  await Promise.all(
    ((runs ?? []) as { id: string }[]).map((run) =>
      voidQuizQuestion(run.id, questionId, { reason: "Voided by admin" }),
    ),
  );
}

export type PublicQuizChoice = {
  id: string;
  questionId: string;
  label: string;
  position: number;
  isCorrect?: boolean;
};

export type PublicQuizState = {
  quizOpen: boolean;
  activeSet: QuizSet | null;
  run: QuizRun | null;
  question: QuizQuestion | null;
  choices: PublicQuizChoice[];
  selectedChoiceId: string | null;
  canAnswer: boolean;
  showAnswer: boolean;
  leaderboard: AdminQuizLeaderboardRow[];
  participants: PublicQuizParticipant[];
  participantsReady: number;
  answersReceived: number;
  serverNow: string;
};

export async function getPublicQuizState(userId?: string): Promise<PublicQuizState> {
  const [{ getSettings }, db] = await Promise.all([
    import("@/lib/settings"),
    Promise.resolve(supabaseAdmin()),
  ]);
  const settings = await getSettings();
  const activeSet = await getActiveQuizSet();
  const run = activeSet ? await getLatestActiveRun(activeSet.id) : null;
  const question =
    run?.currentQuestionId ? await getQuestionWithChoices(run.currentQuestionId) : null;
  const selectedChoiceId =
    userId && run && question
      ? await getSelectedChoiceId(run.id, question.id, userId)
      : null;
  const showAnswer = run?.state === "question_ended" || run?.state === "ended";
  const leaderboard = run && !run.hideLeaderboard ? await listLeaderboard(run.id) : [];
  const participants = run ? await listRunParticipants(run.id, question?.id ?? null) : [];
  const participantsReady = participants.length;
  const answersReceived =
    run && question ? await countQuestionAnswers(run.id, question.id) : 0;
  const now = Date.now();
  const endsAt = run?.currentQuestionEndsAt
    ? new Date(run.currentQuestionEndsAt).getTime()
    : null;

  return {
    quizOpen: settings.quizOpen,
    activeSet,
    run,
    question,
    choices:
      question?.choices.map((choice) => ({
        id: choice.id,
        questionId: choice.questionId,
        label: choice.label,
        position: choice.position,
        ...(showAnswer ? { isCorrect: choice.isCorrect } : {}),
      })) ?? [],
    selectedChoiceId,
    canAnswer:
      settings.quizOpen &&
      run?.state === "question_active" &&
      Boolean(question) &&
      !selectedChoiceId &&
      (!endsAt || endsAt > now),
    showAnswer,
    leaderboard,
    participants,
    participantsReady,
    answersReceived,
    serverNow: new Date().toISOString(),
  };

  async function getQuestionWithChoices(
    questionId: string,
  ): Promise<QuizQuestionWithChoices | null> {
    const { data, error } = await db
      .from("quiz_questions")
      .select("*, quiz_choices(*)")
      .eq("id", questionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    type QuestionJoin = QuizQuestionRow & { quiz_choices: QuizChoiceRow[] | null };
    const row = data as unknown as QuestionJoin;
    return {
      ...mapQuizQuestion(row),
      choices: (row.quiz_choices ?? [])
        .map(mapQuizChoice)
        .sort((a, b) => a.position - b.position),
    };
  }

  async function getSelectedChoiceId(
    runId: string,
    questionId: string,
    participantUserId: string,
  ): Promise<string | null> {
    const { data, error } = await db
      .from("quiz_answers")
      .select("choice_id")
      .eq("run_id", runId)
      .eq("question_id", questionId)
      .eq("user_id", participantUserId)
      .maybeSingle();
    if (error) throw error;
    return (data as { choice_id: string } | null)?.choice_id ?? null;
  }

  async function listRunParticipants(
    runId: string,
    questionId: string | null,
  ): Promise<PublicQuizParticipant[]> {
    const { data, error } = await db
      .from("quiz_run_participants")
      .select("id, display_name, joined_at, last_seen_at")
      .eq("run_id", runId)
      .is("left_at", null)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as {
      id: string;
      display_name: string;
      joined_at: string;
      last_seen_at: string;
    }[];

    if (!questionId || rows.length === 0) {
      return rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        joinedAt: row.joined_at,
        lastSeenAt: row.last_seen_at,
        answeredCurrentQuestion: false,
        selectedChoiceId: null,
        selectedChoiceLabel: null,
        selectedChoicePosition: null,
        currentScore: null,
        currentIsCorrect: null,
      }));
    }

    const { data: answerData, error: answersError } = await db
      .from("quiz_answers")
      .select("participant_id, choice_id, score, is_correct")
      .eq("run_id", runId)
      .eq("question_id", questionId);
    if (answersError) throw answersError;
    const answerRows = (answerData ?? []) as {
      participant_id: string;
      choice_id: string;
      score: number;
      is_correct: boolean;
    }[];
    const answerByParticipant = new Map(
      answerRows.map((row) => [row.participant_id, row]),
    );
    const choiceIds = [...new Set(answerRows.map((row) => row.choice_id))];
    let choiceById = new Map<
      string,
      { label: string; position: number }
    >();
    if (choiceIds.length > 0) {
      const { data: choices, error: choicesError } = await db
        .from("quiz_choices")
        .select("id, label, position")
        .in("id", choiceIds);
      if (choicesError) throw choicesError;
      choiceById = new Map(
        ((choices ?? []) as { id: string; label: string; position: number }[]).map(
          (choice) => [choice.id, { label: choice.label, position: choice.position }],
        ),
      );
    }

    return rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      joinedAt: row.joined_at,
      lastSeenAt: row.last_seen_at,
      answeredCurrentQuestion: answerByParticipant.has(row.id),
      selectedChoiceId: answerByParticipant.get(row.id)?.choice_id ?? null,
      selectedChoiceLabel:
        choiceById.get(answerByParticipant.get(row.id)?.choice_id ?? "")?.label ?? null,
      selectedChoicePosition:
        choiceById.get(answerByParticipant.get(row.id)?.choice_id ?? "")?.position ?? null,
      currentScore: answerByParticipant.get(row.id)?.score ?? null,
      currentIsCorrect: answerByParticipant.get(row.id)?.is_correct ?? null,
    }));
  }

  async function countQuestionAnswers(runId: string, questionId: string): Promise<number> {
    const { count, error } = await db
      .from("quiz_answers")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .eq("question_id", questionId);
    if (error) throw error;
    return count ?? 0;
  }
}
