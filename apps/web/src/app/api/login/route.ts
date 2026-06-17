import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabase } from "@/lib/supabase";
import { verifyChildLogin, findByShortCode } from "@/lib/mock-data";
import { CHILD_COOKIE } from "@/lib/session";

/**
 * POST /api/login
 * Тело: { mode: "pin", childId, pin } | { mode: "code", code }
 *
 * При успехе ставит cookie myshmat_child = UUID ребёнка и возвращает { ok, childId }.
 * PIN на проде проверяется через bcrypt (child_profiles.pin_hash).
 * Если pin_hash не задан — для демо принимаем PIN 1234.
 */
const DEMO_PIN = "1234";

function success(childId: string) {
  const res = NextResponse.json({ ok: true, childId });
  res.cookies.set(CHILD_COOKIE, childId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  });
  return res;
}

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

  // ── короткий код ──
  if (body.mode === "code") {
    if (sb) {
      const { data } = await sb
        .from("child_profiles")
        .select("id")
        .eq("short_code", body.code.toUpperCase())
        .maybeSingle();
      if (data?.id) return success(data.id as string);
      return NextResponse.json({ ok: false, reason: "not-found" });
    }
    const p = findByShortCode(body.code);
    return p ? success(p.id) : NextResponse.json({ ok: false, reason: "not-found" });
  }

  // ── PIN ──
  if (sb) {
    const { data } = await sb
      .from("child_profiles")
      .select("id,pin_hash")
      .eq("id", body.childId)
      .maybeSingle();
    if (!data?.id) {
      return NextResponse.json({ ok: false, reason: "not-found" });
    }
    const hash = (data as { pin_hash?: string | null }).pin_hash;
    let ok = false;
    if (hash) {
      // настоящая проверка bcrypt
      try {
        ok = await bcrypt.compare(body.pin, hash);
      } catch {
        ok = false;
      }
    } else {
      // pin_hash не задан → демо-PIN
      ok = body.pin === DEMO_PIN;
    }
    return ok
      ? success(data.id as string)
      : NextResponse.json({ ok: false, reason: "bad-pin" });
  }

  // ── моки ──
  const ok = verifyChildLogin(body.childId, body.pin);
  return ok
    ? success(body.childId)
    : NextResponse.json({ ok: false, reason: "bad-pin" });
}
