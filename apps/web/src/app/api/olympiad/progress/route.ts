import { NextResponse } from "next/server";
import { getCurrentChildId } from "@/lib/session";
import { saveThemeProgressDb, logOlympiadAttemptDb } from "@/lib/olympiad-db";
import type { ThemeProgress, OlympiadLevel } from "@/types/olympiad";

/**
 * POST /api/olympiad/progress
 * Тело: { progress: ThemeProgress, attempt?: { problemId, level, isCorrect, attemptsUsed } }
 *
 * Сохраняет прогресс ребёнка по теме и (опц.) логирует попытку для аналитики.
 * childId берётся из cookie сессии. Если Supabase не настроен — no-op (ok:true).
 */
export async function POST(req: Request) {
  let body: {
    progress?: ThemeProgress;
    attempt?: { problemId: string; level: OlympiadLevel; isCorrect: boolean | null; attemptsUsed: number };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  const childId = await getCurrentChildId();
  if (body.progress) {
    await saveThemeProgressDb(childId, body.progress);
    if (body.attempt) {
      await logOlympiadAttemptDb({
        childId,
        themeId: body.progress.themeId,
        problemId: body.attempt.problemId,
        level: body.attempt.level,
        isCorrect: body.attempt.isCorrect,
        attemptsUsed: body.attempt.attemptsUsed,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
