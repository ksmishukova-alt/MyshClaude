import { NextResponse } from "next/server";
import { CHILD_COOKIE, ADULT_COOKIE } from "@/lib/session";

/** POST /api/logout — выход (удаляет детскую и взрослую cookie). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CHILD_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(ADULT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
