import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/health — расширенная диагностика подключения к Supabase.
 * Показывает максимум деталей, чтобы понять причину сбоя.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const anonSet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretSet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // какой ключ реально используется и его префикс (без раскрытия значения)
  const usedKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const keyPrefix = usedKey.slice(0, 12); // напр. "sb_publishab" или "eyJhbGciOiJ"

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({
      supabaseConfigured: false,
      url,
      anonSet,
      secretSet,
      hint: "Переменные окружения не заданы.",
    });
  }

  try {
    const { data, count, error, status, statusText } = await sb
      .from("child_profiles")
      .select("id,name", { count: "exact" })
      .limit(3);

    return NextResponse.json({
      supabaseConfigured: true,
      url,
      anonSet,
      secretSet,
      keyPrefix,
      canQuery: !error,
      httpStatus: status ?? null,
      httpStatusText: statusText ?? null,
      childCount: count ?? null,
      rowsReturned: data?.length ?? 0,
      sampleNames: data?.map((r) => r.name) ?? [],
      error: error
        ? {
            message: error.message || "(пусто)",
            code: error.code || null,
            details: error.details || null,
            hint: error.hint || null,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json({
      supabaseConfigured: true,
      url,
      keyPrefix,
      canQuery: false,
      caughtError: e instanceof Error ? { name: e.name, message: e.message } : String(e),
    });
  }
}
