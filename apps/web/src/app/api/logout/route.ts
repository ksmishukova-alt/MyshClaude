import { NextResponse } from "next/server";
import { CHILD_COOKIE } from "@/lib/session";

/** POST /api/logout — выход ребёнка (удаляет cookie). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CHILD_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
