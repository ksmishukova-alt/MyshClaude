/**
 * Питомец-тамагочи МышМат.
 *
 * Модель «лёгкой заботы»: питомец ТОЛЬКО растёт и радуется от учёбы.
 * Он никогда не голодает, не грустит «в минус» и не умирает — никакого давления
 * и чувства вины у ребёнка. Очки роста копятся из реального прогресса по темам.
 *
 * SEAM под Lottie: у каждого вида есть поле `lottie` — карта стадий → путь к файлу
 * анимации (public/myshmat-assets/pets/...). Пока файлов нет, PetView рисует
 * лёгкий визуал на эмодзи/CSS; когда добавишь .json/.lottie и пакет lottie-react —
 * заполняешь `lottie` и PetView переключается на анимацию.
 */

export type PetStageId = "egg" | "baby" | "kid" | "smart" | "master";

export interface PetStage {
  id: PetStageId;
  name: string;
  /** минимальное число очков роста для этой стадии */
  min: number;
  /** визуальный масштаб питомца на этой стадии */
  scale: number;
  /** маленький аксессуар-маркер стадии (эмодзи-рендер) */
  accessory?: string;
}

/** Стадии эволюции: яйцо → малыш → ученик → знаток → мастер. */
export const STAGES: PetStage[] = [
  { id: "egg", name: "Яйцо", min: 0, scale: 0.82 },
  { id: "baby", name: "Малыш", min: 25, scale: 0.92 },
  { id: "kid", name: "Ученик", min: 70, scale: 1.0, accessory: "📖" },
  { id: "smart", name: "Знаток", min: 150, scale: 1.08, accessory: "🎓" },
  { id: "master", name: "Мастер", min: 260, scale: 1.16, accessory: "👑" },
];

export interface PetSpecies {
  id: string;
  name: string;
  /** эмодзи-облик (запасной рендер и превью в каталоге) */
  emoji: string;
  /** код эмодзи в наборе Google Noto Animated Emoji (для анимации по URL) */
  noto: string;
  /** фирменный цвет (свечение, акценты) */
  accent: string;
  /** короткое доброе описание для экрана выбора */
  blurb: string;
  /** SEAM: стадия → путь к своему Lottie-файлу, если захочешь кастомную анимацию */
  lottie?: Partial<Record<PetStageId, string>>;
}

/** Каталог готовых питомцев — ребёнок выбирает одного на старте. */
export const PET_SPECIES: PetSpecies[] = [
  { id: "mouse", name: "Мышонок", emoji: "🐭", noto: "1f42d", accent: "#2E8BE6", blurb: "Умный и любопытный — наш родной мышонок." },
  { id: "dragon", name: "Дракоша", emoji: "🐲", noto: "1f432", accent: "#42C263", blurb: "Смелый и тёплый, любит загадки." },
  { id: "cat", name: "Котёнок", emoji: "🐱", noto: "1f431", accent: "#F39B3C", blurb: "Ласковый и сообразительный." },
  { id: "owl", name: "Совёнок", emoji: "🦉", noto: "1f989", accent: "#8b5cf6", blurb: "Мудрый помощник в задачках." },
  { id: "fox", name: "Лисёнок", emoji: "🦊", noto: "1f98a", accent: "#ee6352", blurb: "Хитрый на выдумки и быстрый." },
  { id: "star", name: "Звёздочка", emoji: "⭐", noto: "2b50", accent: "#f4b400", blurb: "Светится ярче с каждой задачей." },
];

/** Код эмодзи «яйцо» для стадии egg (питомец ещё не вылупился). */
export const EGG_NOTO = "1f95a";

/**
 * Анимация питомца из открытого набора Google Noto Animated Emoji (Apache-2.0),
 * раздаётся прямо с CDN Google — НИЧЕГО скачивать и класть в проект не нужно.
 * Форматы: "webp"/"gif" (как картинка) или "lottie" (вектор, нужен плеер).
 */
export const notoUrl = (cp: string, fmt: "webp" | "gif" | "lottie" = "webp") =>
  fmt === "lottie"
    ? `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`
    : `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.${fmt}`;

export function getSpecies(id: string | undefined): PetSpecies {
  return PET_SPECIES.find((s) => s.id === id) ?? PET_SPECIES[0];
}

/** Текущая стадия по очкам роста. */
export function stageFor(xp: number): PetStage {
  let cur = STAGES[0];
  for (const st of STAGES) if (xp >= st.min) cur = st;
  return cur;
}

/** Следующая стадия (или null, если уже максимум). */
export function nextStage(xp: number): PetStage | null {
  return STAGES.find((s) => s.min > xp) ?? null;
}

/** Прогресс внутри текущей стадии, 0..1 (для полоски роста). */
export function stageProgress(xp: number): number {
  const cur = stageFor(xp);
  const nxt = nextStage(xp);
  if (!nxt) return 1;
  return Math.max(0, Math.min(1, (xp - cur.min) / (nxt.min - cur.min)));
}

/** Очки роста за стадию темы — питомец растёт по мере освоения олимпиадных тем. */
export const THEME_STAGE_POINTS: Record<string, number> = {
  learn: 12,
  train: 30,
  solo: 55,
};
export const BADGE_POINTS = 45;
