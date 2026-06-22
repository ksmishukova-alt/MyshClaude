import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getCurrentChildId, hasChildSession } from "@/lib/session";

/**
 * POST /api/profile/set-pin — ребёнок меняет СВОЙ PIN (по сессии).
 * Тело: { pin: "1234" }. На пилоте храним PIN открытым в колонке pin (низкий риск),
 * сбрасывая pin_hash. Меняется только профиль текущей сессии.
 */
export async function POST(req: Request) {
  if (!(await hasChildSession())) {
    return NextResponse.json({ ok: false, reason: "no-session" }, { status: 403 });
  }
  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }
  if (!body.pin || !/^\d{4}$/.test(body.pin)) {
    return NextResponse.json({ ok: false, reason: "pin-must-be-4-digits" }, { status: 400 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, reason: "no-db" });

  const childId = await getCurrentChildId();
  const { error } = await sb
    .from("child_profiles")
    .update({ pin: body.pin, pin_hash: null })
    .eq("id", childId);
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
