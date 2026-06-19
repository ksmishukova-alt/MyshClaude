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

import type {
  OlympiadLevel,
  OlympiadProblemV2,
  ThemeProgress,
  OlympiadStepResult,
  OlympiadAttemptStatus,
  ReasoningCompleteness,
  TemplateBlank,
} from "@/types/olympiad";
import { OLYMPIAD_LEVELS, LEVEL_SPECS, meetsCompleteness } from "@/types/olympiad";

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
  | "rolledBack"
  | "needsReasoningRevision"
  | "pendingReview";

// ─────────────────────────────────────────────────────────────
// Честный «чистый» зачёт (ТЗ §4)
// ─────────────────────────────────────────────────────────────

/** Сводка по шагам — для определения «чистоты» попытки и аналитики. */
export interface StepsSummary {
  hintsUsed: number;
  anyStepError: boolean;
  totalStepAttempts: number;
  errorCodes: string[];
  /** Были ошибки на шагах, но в итоге все верны и без подсказок. */
  selfCorrection: boolean;
}

export function summarizeSteps(steps: OlympiadStepResult[]): StepsSummary {
  let hintsUsed = 0;
  let anyStepError = false;
  let totalStepAttempts = 0;
  let anyHint = false;
  let allCorrect = steps.length > 0;
  const errorCodes: string[] = [];
  for (const s of steps) {
    if (s.hintUsed) {
      hintsUsed += 1;
      anyHint = true;
    }
    if (s.hadError) anyStepError = true;
    totalStepAttempts += s.attempts;
    if (s.errorCodes?.length) errorCodes.push(...s.errorCodes);
    if (!s.correct) allCorrect = false;
  }
  return {
    hintsUsed,
    anyStepError,
    totalStepAttempts,
    errorCodes,
    selfCorrection: anyStepError && allCorrect && !anyHint,
  };
}

export interface AttemptFacts {
  level: OlympiadLevel;
  finalAnswerCorrect: boolean;
  /** Финальный ответ исчерпал MAX_ATTEMPTS и так и не верен. */
  attemptsExhausted: boolean;
  hintsUsed: number;
  anyStepError: boolean;
  reasoningCompleteness: ReasoningCompleteness;
}

/**
 * Определить статус попытки по правилам уровня (ТЗ §1, §4).
 *  - L5 (manualReview) → всегда pendingReview (ждёт методиста).
 *  - ответ неверный и попытки исчерпаны → failed.
 *  - ответ верный, но полнота ниже порога уровня → needs_reasoning_revision.
 *  - ответ верный, но были подсказки/ошибки на шагах → completed_with_hint.
 *  - ответ верный, без подсказок и ошибок, полнота ок → completed (ЧИСТО).
 */
export function computeAttemptStatus(f: AttemptFacts): OlympiadAttemptStatus {
  const spec = LEVEL_SPECS[f.level];
  if (spec.manualReview) return "pendingReview";
  if (!f.finalAnswerCorrect) return f.attemptsExhausted ? "failed" : "inProgress";
  if (!meetsCompleteness(f.reasoningCompleteness, spec.minCleanCompleteness)) {
    return "needs_reasoning_revision";
  }
  if (f.hintsUsed > 0 || f.anyStepError) return "completed_with_hint";
  return "completed";
}

/** «Чистый» зачёт = решено верно, без подсказок и ошибок, с полной записью. */
export function isCleanStatus(s: OlympiadAttemptStatus): boolean {
  return s === "completed";
}

export interface ResultInput {
  /** Статус попытки (см. computeAttemptStatus). */
  status: OlympiadAttemptStatus;
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
 * Авто-перевод (4 ЧИСТЫХ подряд), откат (2 провала подряд), значок мастерства.
 * «Верно, но не чисто» (подсказка/ошибка/неполная запись) НЕ входит в clean-серию.
 */
export function applyResult(
  progress: ThemeProgress,
  rewardStars: number,
  input: ResultInput,
): ResultOutput {
  const p: ThemeProgress = { ...progress };
  const { status } = input;

  // L5: ждёт проверки методиста — прогресс не двигаем автоматически.
  if (status === "pendingReview") {
    p.solvedAtLevel += 1;
    return { progress: p, event: "pendingReview", notifyMethodist: false };
  }

  // Провал: серия сброшена, считаем подряд-провалы → каскад отката.
  if (status === "failed") {
    p.streak = 0;
    p.consecutiveFails += 1;
    if (p.consecutiveFails >= ROLLBACK_FAILS) {
      const below = prevLevel(p.currentLevel);
      if (below && input.availableLevels.includes(below)) {
        p.currentLevel = below;
        p.solvedAtLevel = 0;
        p.consecutiveFails = 0;
        p.state = "inProgress";
        return { progress: p, event: "rolledBack", notifyMethodist: true };
      }
      return { progress: p, event: "none", notifyMethodist: true };
    }
    return { progress: p, event: "none", notifyMethodist: false };
  }

  // Ответ верный (чисто или с помощью): начисляем звёзды и засчитываем решение.
  p.stars += rewardStars;
  p.solvedAtLevel += 1;
  p.consecutiveFails = 0;
  if (p.state === "open" || p.state === "locked") p.state = "inProgress";

  // Верно, но НЕ чисто → серия сбрасывается, повышения нет.
  if (!isCleanStatus(status)) {
    p.streak = 0;
    return {
      progress: p,
      event: status === "needs_reasoning_revision" ? "needsReasoningRevision" : "solved",
      notifyMethodist: false,
    };
  }

  // Чисто → наращиваем clean-серию.
  p.streak += 1;
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

/**
 * Проверка одного пропуска шаблона решения.
 *  - card: выбран верный вариант (по id);
 *  - number/expression/text: точное нормализованное совпадение ИЛИ совпадение
 *    «последнего числа» (устойчиво к записи «30 × 2 = 60», «30*2=60» и просто «60»).
 */
export function checkBlank(blank: TemplateBlank, input: string): boolean {
  if (blank.kind === "card") {
    return blank.options?.find((o) => o.id === input)?.correct === true;
  }
  const norm = normalize(input);
  if (!norm) return false;
  if (blank.accepted?.some((a) => normalize(a) === norm)) return true;
  const got = extractNumbers(input);
  const target = extractNumbers(blank.accepted?.[0] ?? "");
  if (got.length && target.length) {
    // сравниваем итоговое (последнее) число выражения
    return Math.abs(got[got.length - 1] - target[target.length - 1]) < 1e-9;
  }
  return false;
}
