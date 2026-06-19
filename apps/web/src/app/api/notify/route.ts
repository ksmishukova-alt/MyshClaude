import { NextResponse } from "next/server";

/**
 * Стаб уведомлений методиста/родителя.
 * На проде здесь — Telegram-бот (см. plan.md §7): сигнал методисту о застревании,
 * мягкое уведомление родителю о прогрессе. Сейчас просто логируем и отвечаем ok.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO(phase1): отправка в Telegram-бот по chat_id методиста.
    console.log("[notify]", body);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
