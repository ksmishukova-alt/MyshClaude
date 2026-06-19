import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/set-pin
 * Тело: { childId, pin, adminToken }
 *
 * Устанавливает bcrypt-хэш PIN ребёнку. Защищено простым токеном из env
 * (ADMIN_TOKEN). Это служебный эндпоинт для настройки, не для детей.
 *
 * Без ADMIN_TOKEN в env — эндпоинт отключён.
 */
export async function POST(req: Request) {
  const admin = process.env.ADMIN_TOKEN;
  if (!admin) {
    return NextResponse.json({ ok: false, reason: "disabled" }, { status: 403 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, reason: "no-db" }, { status: 400 });

  let body: { childId: string; pin: string; adminToken: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  if (body.adminToken !== admin) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!/^\d{4}$/.test(body.pin)) {
    return NextResponse.json({ ok: false, reason: "pin-must-be-4-digits" }, { status: 400 });
  }

  const hash = await bcrypt.hash(body.pin, 10);
  const { error } = await sb
    .from("child_profiles")
    .update({ pin_hash: hash })
    .eq("id", body.childId);

  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
