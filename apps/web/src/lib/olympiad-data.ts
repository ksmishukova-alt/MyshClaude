import type { OlympiadTheme, OlympiadProblemV2, ThemeProgress } from "@/types/olympiad";
import * as mock from "@/lib/olympiad-content";
import {
  getThemesDb,
  getThemeDb,
  getProblemDb,
  getProblemsByThemeDb,
  getThemeProgressMapDb,
  getThemeProgressDb,
} from "@/lib/olympiad-db";

/**
 * Единый слой данных олимпиадного ядра.
 * Если Supabase настроен (есть env) — берём из БД; иначе — мок-контент.
 * Сигнатуры одинаковые, страницы/компоненты не зависят от источника
 * (тот же приём, что в lib/data.ts для Daily).
 */

export async function fetchThemes(): Promise<OlympiadTheme[]> {
  return (await getThemesDb()) ?? mock.getThemes();
}

export async function fetchTheme(id: string): Promise<OlympiadTheme | null> {
  return (await getThemeDb(id)) ?? mock.getTheme(id);
}

export async function fetchProblem(id: string): Promise<OlympiadProblemV2 | null> {
  return (await getProblemDb(id)) ?? mock.getProblem(id);
}

export async function fetchProblemsByTheme(
  themeId: string,
): Promise<Record<string, OlympiadProblemV2[]>> {
  return (await getProblemsByThemeDb(themeId)) ?? mock.getProblemsByTheme(themeId);
}

export async function fetchThemeProgressMap(
  childId: string,
): Promise<Record<string, ThemeProgress>> {
  return (await getThemeProgressMapDb(childId)) ?? mock.getThemeProgressMap();
}

export async function fetchThemeProgress(
  childId: string,
  themeId: string,
): Promise<ThemeProgress> {
  return (await getThemeProgressDb(childId, themeId)) ?? mock.getThemeProgress(themeId);
}
