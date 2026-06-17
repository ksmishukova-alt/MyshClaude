import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();

  if (!sb) {
    return NextResponse.json({
      supabaseConfigured: false,
      canQuery: false,
      hint: "Переменные окружения не заданы — приложение работает на моках.",
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
        hint: "Ключи заданы, но запрос не прошёл. Проверь, что миграции выполнены.",
      });
    }

    return NextResponse.json({
      supabaseConfigured: true,
      canQuery: true,
      childCount: count ?? 0,
      hint: (count ?? 0) > 0
        ? "Всё работает: Supabase подключён, данные видны."
        : "Подключение есть, но таблица пустая — выполни сид.",
    });
  } catch (e) {
    return NextResponse.json({
      supabaseConfigured: true,
      canQuery: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}