import { notFound } from "next/navigation";
import { fetchTheme, fetchThemeProgress, fetchProblemsByTheme } from "@/lib/olympiad-data";
import { getCurrentChildId } from "@/lib/session";
import { ThemePlay } from "@/components/olympiad/ThemePlay";
import "../topics.css";
import "@/components/olympiad/olympiad-core.css";

/**
 * Экран прохождения темы: лестница уровней, текущий уровень и поток задач
 * с прогрессией (3 попытки, нарастающие подсказки, авто-перевод 4-подряд, откат).
 * Тема/прогресс/задачи приходят из БД (Supabase) с откатом на мок-слой.
 */
export default async function ThemePage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = await params;
  const childId = await getCurrentChildId();
  const theme = await fetchTheme(themeId);
  if (!theme) notFound();
  const [progress, problemsByLevel] = await Promise.all([
    fetchThemeProgress(childId, themeId),
    fetchProblemsByTheme(themeId),
  ]);

  return (
    <ThemePlay theme={theme} initialProgress={progress} problemsByLevel={problemsByLevel} />
  );
}
