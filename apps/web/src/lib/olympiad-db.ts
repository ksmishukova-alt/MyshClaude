import { getSupabase } from "@/lib/supabase";
import type {
  OlympiadTheme,
  OlympiadProblemV2,
  OlympiadLevel,
  ThemeProgress,
} from "@/types/olympiad";

/**
 * Репозиторий олимпиадного ядра поверх Supabase.
 * Контент (темы/задачи) хранится JSONB-документами в колонке data,
 * прогресс — нормализованной строкой. Если Supabase не настроен — функции
 * возвращают null, и слой-диспетчер (olympiad-data.ts) падает на мок-контент.
 */

export async function getThemesDb(): Promise<OlympiadTheme[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("olympiad_themes")
    .select("data")
    .order("ord");
  if (error || !data) return null;
  return data.map((r) => r.data as OlympiadTheme);
}

export async function getThemeDb(id: string): Promise<OlympiadTheme | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("olympiad_themes").select("data").eq("id", id).maybeSingle();
  return (data?.data as OlympiadTheme) ?? null;
}

export async function getProblemDb(id: string): Promise<OlympiadProblemV2 | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("olympiad_problems").select("data").eq("id", id).maybeSingle();
  return (data?.data as OlympiadProblemV2) ?? null;
}

/** Все задачи темы, сгруппированные по уровню (для экрана прохождения темы). */
export async function getProblemsByThemeDb(
  themeId: string,
): Promise<Record<string, OlympiadProblemV2[]> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("olympiad_problems")
    .select("level,ord,data")
    .eq("theme_id", themeId)
    .order("level")
    .order("ord");
  if (error || !data) return null;
  const byLevel: Record<string, OlympiadProblemV2[]> = {};
  for (const row of data) {
    const lvl = row.level as string;
    (byLevel[lvl] ??= []).push(row.data as OlympiadProblemV2);
  }
  return byLevel;
}

/**
 * Карта прогресса ребёнка по всем темам. Открытость узлов вычисляется
 * из зависимостей (как в мок-слое): тема открыта, если все dependsOn пройдены.
 */
export async function getThemeProgressMapDb(
  childId: string,
): Promise<Record<string, ThemeProgress> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const themes = await getThemesDb();
  if (!themes) return null;

  const { data: rows } = await sb
    .from("child_theme_progress")
    .select("theme_id,current_level,streak,solved_at_level,consecutive_fails,stars,badge_earned,state")
    .eq("child_id", childId);

  const map: Record<string, ThemeProgress> = {};
  for (const t of themes) {
    const r = rows?.find((x) => x.theme_id === t.id);
    map[t.id] = r
      ? {
          themeId: t.id,
          currentLevel: r.current_level as OlympiadLevel,
          streak: r.streak ?? 0,
          solvedAtLevel: r.solved_at_level ?? 0,
          consecutiveFails: r.consecutive_fails ?? 0,
          stars: r.stars ?? 0,
          badgeEarned: !!r.badge_earned,
          state: (r.state as ThemeProgress["state"]) ?? "locked",
        }
      : {
          themeId: t.id,
          currentLevel: t.levels[0],
          streak: 0,
          solvedAtLevel: 0,
          consecutiveFails: 0,
          stars: 0,
          badgeEarned: false,
          state: "locked",
        };
  }
  // открыть темы с пройденными зависимостями
  for (const t of themes) {
    const p = map[t.id];
    if (p.state !== "locked") continue;
    if (t.dependsOn.every((dep) => map[dep]?.badgeEarned)) p.state = "open";
  }
  return map;
}

export async function getThemeProgressDb(
  childId: string,
  themeId: string,
): Promise<ThemeProgress | null> {
  const map = await getThemeProgressMapDb(childId);
  return map?.[themeId] ?? null;
}

/** Сохранить прогресс ребёнка по теме (upsert). */
export async function saveThemeProgressDb(
  childId: string,
  p: ThemeProgress,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("child_theme_progress").upsert(
    {
      child_id: childId,
      theme_id: p.themeId,
      current_level: p.currentLevel,
      streak: p.streak,
      solved_at_level: p.solvedAtLevel,
      consecutive_fails: p.consecutiveFails,
      stars: p.stars,
      badge_earned: p.badgeEarned,
      state: p.state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,theme_id" },
  );
  return !error;
}

/** Лог попытки олимпиадной задачи (аналитика методиста). */
export async function logOlympiadAttemptDb(args: {
  childId: string;
  problemId: string;
  themeId: string;
  level: OlympiadLevel;
  isCorrect: boolean | null;
  attemptsUsed: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("olympiad_attempts").insert({
    child_id: args.childId,
    problem_id: args.problemId,
    theme_id: args.themeId,
    level: args.level,
    is_correct: args.isCorrect,
    attempts_used: args.attemptsUsed,
  });
}
