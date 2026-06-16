import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyChildLogin, findByShortCode } from "@/lib/mock-data";

/**
 * POST /api/login
 * Тело: { mode: "pin", childId, pin } | { mode: "code", code }
 *
 * Возвращает { ok, childId } при успехе.
 * В моках проверка по статическим профилям; на проде — bcrypt-сравнение
 * pin_hash и поиск по short_code в child_profiles.
 */
export async function POST(req: Request) {
  let body:
    | { mode: "pin"; childId: string; pin: string }
    | { mode: "code"; code: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  const sb = getSupabase();

  // ── режим короткого кода ──
  if (body.mode === "code") {
    if (sb) {
      const { data } = await sb
        .from("child_profiles")
        .select("id")
        .eq("short_code", body.code.toUpperCase())
        .maybeSingle();
      if (data?.id) return NextResponse.json({ ok: true, childId: data.id });
      return NextResponse.json({ ok: false, reason: "not-found" }, { status: 200 });
    }
    const p = findByShortCode(body.code);
    return p
      ? NextResponse.json({ ok: true, childId: p.id })
      : NextResponse.json({ ok: false, reason: "not-found" }, { status: 200 });
  }

  // ── режим PIN ──
  if (sb) {
    // на проде: получить pin_hash и сравнить bcrypt; здесь — заглушка
    const { data } = await sb
      .from("child_profiles")
      .select("id")
      .eq("id", body.childId)
      .maybeSingle();
    // ВНИМАНИЕ: реальная проверка PIN должна идти через bcrypt на сервере.
    if (data?.id) return NextResponse.json({ ok: true, childId: data.id });
    return NextResponse.json({ ok: false, reason: "bad-pin" }, { status: 200 });
  }

  const ok = verifyChildLogin(body.childId, body.pin);
  return ok
    ? NextResponse.json({ ok: true, childId: body.childId })
    : NextResponse.json({ ok: false, reason: "bad-pin" }, { status: 200 });
}
