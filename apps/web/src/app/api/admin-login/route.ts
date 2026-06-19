import { NextResponse } from "next/server";
import { ADULT_COOKIE } from "@/lib/session";

/**
 * POST /api/admin-login — вход взрослого (методист/родитель).
 * Тело: { role: "methodist" | "parent", password: string }
 *
 * Пароли берутся из env (METHODIST_PASSWORD / PARENT_PASSWORD).
 * Если env не задан — используется пилотный дефолт. На проде задайте env.
 * Это временная схема входа; полноценный аккаунт-логин взрослого — фаза 1.
 */
const DEFAULTS: Record<string, string> = {
  methodist: process.env.METHODIST_PASSWORD ?? "mishmat-method",
  parent: process.env.PARENT_PASSWORD ?? "mishmat-parent",
};

export async function POST(req: Request) {
  let body: { role?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }
  const role = body.role === "parent" ? "parent" : "methodist";
  const expected = DEFAULTS[role];
  if (!body.password || body.password !== expected) {
    return NextResponse.json({ ok: false, reason: "bad-password" });
  }
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(ADULT_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 часов
  });
  return res;
}
