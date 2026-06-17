import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/health
 * Диагностика подключения к Supabase. Открой в браузере:
 *   https://<твой-домен>/api/health
 *
 * Отвечает JSON:
 *  - supabaseConfigured: заданы ли переменные окружения
 *  - canQuery: удалось ли выполнить запрос к БД
 *  - childCount: сколько профилей детей видно (проверка, что миграции+сид прошли)
 *  - error: текст ошибки, если запрос не удался
 *
 * Никаких секретов в ответе нет — только статусы.
 */
export async function GET() {
  const sb = getSupabase();

  if (!sb) {
    return NextResponse.json({
      supabaseConfigured: false,
      canQuery: false,
      hint: "Переменные NEXT_PUBLIC_SUPABASE_URL / ключ не заданы — приложение работает на моках.",
    });
  }

  try {
    const { count, error } = await sb
      .from("child_profiles")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        supabaseConfigured: true,
        canQuery: false,
        error: error.message,
        hint: "Ключи заданы, но запрос не прошёл. Проверь, что миграции выполнены и таблица child_profiles существует.",
      });
    }

    return NextResponse.json({
      supabaseConfigured: true,
      canQuery: true,
      childCount: count ?? 0,
      hint:
        (count ?? 0) > 0
          ? "Всё работает: Supabase подключён, данные видны."
          : "Подключение есть, но таблица пустая — выполни сид 0002_seed.sql.",
    });
  } catch (e) {
    return NextResponse.json({
      supabaseConfigured: true,
      canQuery: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
