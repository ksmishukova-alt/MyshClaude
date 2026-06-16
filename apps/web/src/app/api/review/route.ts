import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { ReviewVerdict } from "@/types/domain";

/**
 * POST /api/review
 * Тело: { attemptId, verdict, feedback }
 *
 * Методист зачитывает/возвращает работу «на листочке».
 * verdict: successful | perfect | needsRevision.
 * Обновляет попытку и прогресс предмета, затем пересчитывает Daily
 * (на случай, если зачёт закрывает последний предмет → МышРутка).
 *
 * Без Supabase возвращает ok:false (фронт работает на моках).
 */
export async function POST(req: Request) {
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, reason: "supabase-not-configured" },
      { status: 200 }
    );
  }

  let body: { attemptId: string; verdict: ReviewVerdict; feedback?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  // статус попытки = вердикт
  const { data: attempt, error } = await sb
    .from("daily_task_attempts")
    .update({
      status: body.verdict,
      feedback: body.feedback ?? null,
      checked_at: new Date().toISOString(),
    })
    .eq("id", body.attemptId)
    .select("session_id, task_id")
    .single();

  if (error || !attempt) {
    return NextResponse.json({ ok: false, reason: error?.message }, { status: 500 });
  }

  // обновим прогресс предмета: найдём subject задания
  const { data: task } = await sb
    .from("tasks")
    .select("subject")
    .eq("id", attempt.task_id)
    .single();

  if (task) {
    await sb
      .from("daily_subject_progress")
      .update({ status: body.verdict })
      .eq("session_id", attempt.session_id)
      .eq("subject", task.subject);
  }

  // пересчёт Daily + возможная выдача МышРутки
  await sb.rpc("recompute_daily_and_grant_myshroutka", {
    p_session: attempt.session_id,
  });

  return NextResponse.json({ ok: true });
}
