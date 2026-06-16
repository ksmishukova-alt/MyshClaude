import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { StepStat } from "@/types/domain";

/**
 * POST /api/attempts
 * Тело: { sessionId, taskId, childId, mode, isCorrect?, autonomyScore, steps: StepStat[] }
 *
 * Сохраняет попытку и пошаговую аналитику, помечает прогресс предмета,
 * затем пересчитывает Daily и при необходимости выдаёт МышРутку (RPC).
 *
 * Если Supabase не настроен — возвращает ok:false (фронт работает на моках).
 */
export async function POST(req: Request) {
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, reason: "supabase-not-configured" },
      { status: 200 }
    );
  }

  let body: {
    sessionId: string;
    taskId: string;
    childId: string;
    mode: "platform" | "worksheet";
    isCorrect?: boolean;
    autonomyScore?: number;
    steps?: StepStat[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  const status =
    body.mode === "worksheet"
      ? "submitted" // листочек уходит на проверку взрослому
      : body.isCorrect
      ? "successful"
      : "submitted";

  const { data: attempt, error: attErr } = await sb
    .from("daily_task_attempts")
    .insert({
      session_id: body.sessionId,
      task_id: body.taskId,
      child_id: body.childId,
      mode: body.mode,
      is_correct: body.isCorrect ?? null,
      autonomy_score: body.autonomyScore ?? null,
      status,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (attErr || !attempt) {
    return NextResponse.json({ ok: false, reason: attErr?.message }, { status: 500 });
  }

  // пошаговая статистика
  if (body.steps?.length) {
    await sb.from("task_step_stats").insert(
      body.steps.map((s) => ({
        attempt_id: attempt.id,
        step_id: s.stepId,
        attempts: s.attempts,
        hint_used: s.hintUsed,
        solved_first_try: s.solvedFirstTry,
        skipped_with_error: s.skippedWithError,
      }))
    );
  }

  // пересчёт Daily + выдача МышРутки
  await sb.rpc("recompute_daily_and_grant_myshroutka", { p_session: body.sessionId });

  return NextResponse.json({ ok: true, attemptId: attempt.id });
}
