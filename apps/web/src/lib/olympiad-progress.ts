/**
 * Логика прогрессии олимпиадного ядра (см. plan.md §3.3–3.4).
 * Чистые функции — без React/БД, легко тестируются.
 *
 *  - На каждом уровне ~10 задач.
 *  - 4 решённых ПОДРЯД без ошибок → авто-перевод на уровень выше.
 *  - 3 попытки на задачу.
 *  - Каскад провала: подсказки нарастают → альтернативная задача →
 *    откат на уровень ниже → уведомление методисту.
 */

import type { OlympiadLevel, OlympiadProblemV2, ThemeProgress } from "@/types/olympiad";
import { OLYMPIAD_LEVELS } from "@/types/olympiad";

/** Попыток на задачу (как в Daily). */
export const MAX_ATTEMPTS = 3;
/** Сколько решить подряд без ошибок, чтобы подняться на уровень. */
export const PROMOTE_STREAK = 4;
/** Сколько задач на одном уровне (ориентир). */
export const PROBLEMS_PER_LEVEL = 10;
/** Сколько задач подряд провалить, чтобы откатиться на уровень ниже. */
export const ROLLBACK_FAILS = 2;

export function nextLevel(level: OlympiadLevel): OlympiadLevel | null {
  const i = OLYMPIAD_LEVELS.indexOf(level);
  return i >= 0 && i < OLYMPIAD_LEVELS.length - 1 ? OLYMPIAD_LEVELS[i + 1] : null;
}

export function prevLevel(level: OlympiadLevel): OlympiadLevel | null {
  const i = OLYMPIAD_LEVELS.indexOf(level);
  return i > 0 ? OLYMPIAD_LEVELS[i - 1] : null;
}

/** Ограничить уровень рамками тех, что заведены у темы. */
export function clampLevel(level: OlympiadLevel, available: OlympiadLevel[]): OlympiadLevel {
  if (available.includes(level)) return level;
  // ближайший доступный снизу, иначе первый доступный
  for (let i = OLYMPIAD_LEVELS.indexOf(level); i >= 0; i--) {
    if (available.includes(OLYMPIAD_LEVELS[i])) return OLYMPIAD_LEVELS[i];
  }
  return available[0];
}

export type ProgressEvent =
  | "none"
  | "solved"
  | "promoted"
  | "mastered"
  | "rolledBack";

export interface ResultInput {
  /** Решено ли верно (для ручных L5 — оптимистично true до проверки методиста). */
  correct: boolean;
  /** Целевой уровень мастерства темы (для значка). */
  masteryLevel: OlympiadLevel;
  /** Уровни, заведённые у темы. */
  availableLevels: OlympiadLevel[];
}

export interface ResultOutput {
  progress: ThemeProgress;
  event: ProgressEvent;
  /** Нужно ли уведомить методиста (откат / застревание). */
  notifyMethodist: boolean;
}

/**
 * Применить результат одной задачи к прогрессу темы.
 * Реализует авто-перевод (4 подряд), откат (2 провала подряд) и значок мастерства.
 */
export function applyResult(
  progress: ThemeProgress,
  rewardStars: number,
  input: ResultInput,
): ResultOutput {
  const p: ThemeProgress = { ...progress };

  if (!input.correct) {
    p.streak = 0;
    p.consecutiveFails += 1;
    // Каскад: после ROLLBACK_FAILS провалов — откат на уровень ниже + сигнал методисту.
    if (p.consecutiveFails >= ROLLBACK_FAILS) {
      const below = prevLevel(p.currentLevel);
      if (below && input.availableLevels.includes(below)) {
        p.currentLevel = below;
        p.solvedAtLevel = 0;
        p.consecutiveFails = 0;
        p.state = "inProgress";
        return { progress: p, event: "rolledBack", notifyMethodist: true };
      }
      // Откатываться некуда (уже L1) — всё равно сигналим методисту о застревании.
      return { progress: p, event: "none", notifyMethodist: true };
    }
    return { progress: p, event: "none", notifyMethodist: false };
  }

  // Верно:
  p.stars += rewardStars;
  p.solvedAtLevel += 1;
  p.consecutiveFails = 0;
  p.streak += 1;
  if (p.state === "open" || p.state === "locked") p.state = "inProgress";

  if (p.streak >= PROMOTE_STREAK) {
    const up = nextLevel(p.currentLevel);
    const masteryReached =
      OLYMPIAD_LEVELS.indexOf(p.currentLevel) >= OLYMPIAD_LEVELS.indexOf(input.masteryLevel);
    if (masteryReached && !p.badgeEarned) {
      p.badgeEarned = true;
      p.state = "mastered";
    }
    if (up && input.availableLevels.includes(up)) {
      p.currentLevel = up;
      p.streak = 0;
      p.solvedAtLevel = 0;
      return { progress: p, event: masteryReached ? "mastered" : "promoted", notifyMethodist: false };
    }
    // Выше некуда — тема пройдена до потолка.
    p.badgeEarned = true;
    p.state = "mastered";
    return { progress: p, event: "mastered", notifyMethodist: false };
  }

  return { progress: p, event: "solved", notifyMethodist: false };
}

// ─────────────────────────────────────────────────────────────
// Проверка ответа
// ─────────────────────────────────────────────────────────────

/** Нормализация строки для сверки: нижний регистр, убрать лишние пробелы и знаки. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,;:!?'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Вытащить все числа из строки (для ответов вида «5 зайцев, 3 змеи»). */
export function extractNumbers(s: string): number[] {
  return (s.match(/-?\d+(?:[.,]\d+)?/g) ?? []).map((x) => parseFloat(x.replace(",", ".")));
}

/** Безопасно вычислить простое арифметическое выражение (+ - * / × ÷ и скобки). */
export function evalExpression(s: string): number | null {
  const cleaned = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/[^0-9+\-*/.() ]/g, "");
  if (!cleaned.trim()) return null;
  try {
    // Ограниченный безопасный eval: только цифры и операторы (символы отфильтрованы выше).
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict";return (${cleaned})`)();
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Совпадают ли мультимножества чисел (порядок не важен). */
function sameNumberMultiset(a: number[], b: number[]): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => Math.abs(v - sb[i]) < 1e-9);
}

/**
 * Проверка финального ответа задачи.
 * Стратегия: точное нормализованное совпадение ИЛИ совпадение по множеству чисел
 * (устойчиво к «5 зайцев, 3 змеи» / «5 и 3» / «зайцев 5, змей 3»).
 */
export function checkFinalAnswer(problem: OlympiadProblemV2, input: string): boolean {
  const candidates = [problem.expectedAnswer, ...(problem.acceptedAnswers ?? [])];
  const normIn = normalize(input);
  if (!normIn) return false;
  for (const c of candidates) {
    if (normalize(c) === normIn) return true;
  }
  // Сверка по числам, если в эталоне есть числа.
  const expectedNums = extractNumbers(problem.expectedAnswer);
  if (expectedNums.length > 0) {
    if (sameNumberMultiset(extractNumbers(input), expectedNums)) return true;
  }
  return false;
}

/** Проверка ответа одного шага (number/expression/choice/order/findError). */
export function checkStepAnswer(
  accepted: string[] | undefined,
  input: string,
  asExpression = false,
): boolean {
  if (!accepted || accepted.length === 0) return true; // info-шаг
  const normIn = normalize(input);
  if (accepted.some((a) => normalize(a) === normIn)) return true;
  // числовое/выражение сравнение
  const target = extractNumbers(accepted[0]);
  if (target.length === 1) {
    const val = asExpression ? evalExpression(input) : extractNumbers(input)[0];
    if (val != null && Math.abs(val - target[0]) < 1e-9) return true;
  }
  return false;
}
