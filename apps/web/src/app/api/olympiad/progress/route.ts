import { NextResponse } from "next/server";
import { getCurrentChildId } from "@/lib/session";
import { saveThemeProgressDb, saveOlympiadAttemptDb } from "@/lib/olympiad-db";
import type { ThemeProgress, OlympiadTaskAttempt } from "@/types/olympiad";

/**
 * POST /api/olympiad/progress
 * Тело: { progress?: ThemeProgress, attempt?: OlympiadTaskAttempt }
 *
 * Сохраняет прогресс ребёнка по теме и ПОЛНУЮ попытку (структура решения, шаги,
 * подсказки, ошибки, полнота, статус — ТЗ §1). childId берётся из cookie сессии.
 * Если Supabase не настроен — no-op (фронт работает на моках, это нормально).
 */
export async function POST(req: Request) {
  let body: { progress?: ThemeProgress; attempt?: OlympiadTaskAttempt };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  const childId = await getCurrentChildId();
  if (body.progress) await saveThemeProgressDb(childId, body.progress);
  if (body.attempt) await saveOlympiadAttemptDb(childId, body.attempt);

  return NextResponse.json({ ok: true });
}
