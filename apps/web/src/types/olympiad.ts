/**
 * МышМат — олимпиадное ядро (игровой мир).
 *
 * Ключевая идея (см. plan.md §3):
 *   УРОВЕНЬ — ЭТО МЕТОД, А НЕ СВОЙСТВО ЗАДАЧИ.
 *   Одна и та же тема проходится на разной глубине L1→…→L5/L6.
 *   Уровень описывает СПОСОБ работы с задачей и степень самостоятельности
 *   записи рассуждения, а не «сложность ячейки».
 *
 * Тема — ЕДИНЫЙ УЗЕЛ карты мира, проходимый на разной глубине
 * (а не отдельные узлы «Чётность L1», «Чётность L2»).
 *
 * Этот модуль — контракт данных. Он намеренно не зависит от React и Supabase,
 * чтобы перенос на боевую БД (репозиторий-слой) был дешёвым.
 */

// ─────────────────────────────────────────────────────────────
// Уровни L1–L6
// ─────────────────────────────────────────────────────────────

export type OlympiadLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export const OLYMPIAD_LEVELS: OlympiadLevel[] = ["L1", "L2", "L3", "L4", "L5", "L6"];

/**
 * Режим записи рассуждения для уровня:
 * - guidedFull    (L1–L2): пошагово, система ведёт «за руку», полные описания шагов, подсказки.
 * - guidedCompact (L3):    шаги без подробных описаний; ребёнок сам расставляет план,
 *                          дополняет решение, ищет ошибку в чужом решении. Подсказок минимум.
 * - actionByAction(L4):    видит условие и число действий; заходит в действие →
 *                          указывает тип действия → записывает выражение → так до ответа.
 *                          Ответ — с лёгким опорным контекстом.
 * - worksheet     (L5):    олимпиадный формат, полная самостоятельность. На листочке:
 *                          фото + авто-проверка ответа/структуры + проверка методиста.
 * - algebraic     (L6):    альтернатива пошаговости — формулы/уравнения, минимальная запись.
 */
export type ReasoningMode =
  | "guidedFull"
  | "guidedCompact"
  | "actionByAction"
  | "worksheet"
  | "algebraic";

export type HintPolicy = "many" | "some" | "minimal" | "none";

export interface LevelSpec {
  id: OlympiadLevel;
  /** Короткое имя, напр. «Уровень 1». */
  title: string;
  /** Суть уровня одной фразой (для карточки уровня). */
  tagline: string;
  reasoningMode: ReasoningMode;
  hintPolicy: HintPolicy;
  /** Ориентир степени самостоятельности 0..1 (для описания и аналитики). */
  autonomy: number;
  /** Нужна ли ручная проверка методиста (фото листочка / письменное). */
  manualReview: boolean;
  /** Формат записи решения на уровне (ТЗ §5). Постепенно снимает поддержку. */
  recordingFormat: RecordingFormat;
  /**
   * Минимальная полнота записи решения для «чистого» зачёта на уровне (ТЗ §4).
   * Если финальный ответ верный, но полнота ниже этого порога —
   * статус needs_reasoning_revision, и задача НЕ входит в clean-серию.
   */
  minCleanCompleteness: ReasoningCompleteness;
}

export const LEVEL_SPECS: Record<OlympiadLevel, LevelSpec> = {
  L1: {
    id: "L1",
    title: "Уровень 1",
    tagline: "Ведём за руку: пошагово, с подсказками, по шаблону. Типовые задачи.",
    reasoningMode: "guidedFull",
    hintPolicy: "many",
    autonomy: 0.1,
    manualReview: false,
    recordingFormat: "solution_fill_blanks",
    minCleanCompleteness: "partial",
  },
  L2: {
    id: "L2",
    title: "Уровень 2",
    tagline: "То же ведение и шаблон — но задачи нетиповые.",
    reasoningMode: "guidedFull",
    hintPolicy: "some",
    autonomy: 0.3,
    manualReview: false,
    recordingFormat: "solution_plan_builder",
    minCleanCompleteness: "partial",
  },
  L3: {
    id: "L3",
    title: "Уровень 3",
    tagline: "Пошагово, но подсказок минимум: сам расставь план и дополни решение.",
    reasoningMode: "guidedCompact",
    hintPolicy: "minimal",
    autonomy: 0.55,
    manualReview: false,
    recordingFormat: "reasoning_text_builder",
    minCleanCompleteness: "complete",
  },
  L4: {
    id: "L4",
    title: "Уровень 4",
    tagline: "Без подсказок. Видишь число действий: действие → выражение → ответ.",
    reasoningMode: "actionByAction",
    hintPolicy: "none",
    autonomy: 0.8,
    manualReview: false,
    recordingFormat: "action_explanation_choice",
    minCleanCompleteness: "complete",
  },
  L5: {
    id: "L5",
    title: "Уровень 5",
    tagline: "Олимпиадный формат: полная самостоятельность, решение на листочке.",
    reasoningMode: "worksheet",
    hintPolicy: "none",
    autonomy: 1,
    manualReview: true,
    recordingFormat: "full_written_solution",
    minCleanCompleteness: "complete",
  },
  L6: {
    id: "L6",
    title: "Уровень 6",
    tagline: "Алгебраический метод: формулы и уравнения, минимальная запись.",
    reasoningMode: "algebraic",
    hintPolicy: "none",
    autonomy: 1,
    manualReview: false,
    recordingFormat: "full_written_solution",
    minCleanCompleteness: "complete",
  },
};

/**
 * СТАДИИ (детский интерфейс, A+C). Уровни L1–L6 — внутренний движок опоры,
 * ребёнку же показываем 3 понятные стадии «Учусь → Тренируюсь → Решаю сам».
 * Опора убывает адаптивно (clean-серия → уровень выше внутри стадии).
 */
export type ThemeStage = "learn" | "train" | "solo";
export const THEME_STAGES: ThemeStage[] = ["learn", "train", "solo"];
export const STAGE_DEFS: Record<ThemeStage, { name: string; tagline: string; color: string; levels: OlympiadLevel[] }> = {
  learn: { name: "Учусь", tagline: "Разбираем метод на типовых задачах с опорой.", color: "green", levels: ["L1", "L2"] },
  train: { name: "Тренируюсь", tagline: "Задачи посложнее, опора убывает — решаешь сам.", color: "blue", levels: ["L3", "L4"] },
  solo: { name: "Решаю сам", tagline: "Олимпиадный формат: чистый лист и проверка методиста.", color: "pink", levels: ["L5", "L6"] },
};
export function levelToStage(l: OlympiadLevel): ThemeStage {
  if (l === "L1" || l === "L2") return "learn";
  if (l === "L3" || l === "L4") return "train";
  return "solo";
}

/**
 * Дружелюбные названия уровней для детских карточек (макеты) +
 * цветовой класс узла. Цвета берут палитру маскота: L1 зелёный … L5 розовый.
 */
export const LEVEL_UI: Record<OlympiadLevel, { name: string; color: string }> = {
  L1: { name: "Знакомство с темой", color: "green" },
  L2: { name: "Простые случаи", color: "blue" },
  L3: { name: "Несколько типов", color: "purple" },
  L4: { name: "Сложные условия", color: "orange" },
  L5: { name: "Мастер уровня", color: "pink" },
  L6: { name: "Алгебра темы", color: "teal" },
};

// ─────────────────────────────────────────────────────────────
// Шаги структурированного решения (для guided/compact/action)
// ─────────────────────────────────────────────────────────────

/**
 * Тип шага решения:
 * - info        : наблюдение/факт, ответа нет (только «Понятно»). Используется на L1.
 * - choice      : выбор одного варианта.
 * - number      : ввод числа.
 * - expression  : ввод выражения/вычисления (напр. «20 ÷ 4»). Сверяется по значению.
 * - order       : расставить пункты плана по порядку (L3).
 * - findError   : найти неверный шаг в чужом решении (L3).
 */
export type OlympiadStepKind =
  | "info"
  | "choice"
  | "number"
  | "expression"
  | "order"
  | "findError";

export interface OlympiadStepOption {
  id: string;
  label: string;
  /** Верный вариант (для choice / findError). */
  correct?: boolean;
}

export interface OlympiadStep {
  id: string;
  /** Короткий вопрос/заголовок шага. Виден на всех уровнях. */
  title: string;
  /**
   * Полное ведение «за руку»: показывается на L1–L2 (guidedFull),
   * на L3 скрыто (ребёнок действует сам). Это и есть «сжатие раннера».
   */
  guidance?: string;
  kind: OlympiadStepKind;
  /** Подсказка к конкретному шагу (доступна со 2-й попытки шага). */
  hint?: string;

  // choice / order / findError:
  options?: OlympiadStepOption[];
  /** Для order — правильный порядок (массив option.id). */
  correctOrder?: string[];

  // number / expression:
  /** Допустимые ответы (число/выражение). Сверяются нормализованно или по значению. */
  accepted?: string[];

  // L4 (actionByAction):
  /** Варианты «типа действия» (умножение / вычитание / деление / сложение). */
  actionKindOptions?: string[];
  /** Правильный тип действия. */
  actionKind?: string;
  /**
   * L4 (action_explanation_choice): варианты короткого объяснения «почему так».
   * Ребёнок выбирает корректное объяснение действия. correct помечает верное.
   */
  explainOptions?: OlympiadStepOption[];
  /**
   * Часть записи решения, которую наполняет ответ этого шага.
   * Позволяет собрать запись решения (selectedData/plan/steps/reasoning/answer)
   * из шагов на ведомых уровнях. По умолчанию — solutionSteps.
   */
  recordField?: SolutionField;
  /** Подпись «пропуска» для L1 (solution_fill_blanks), напр. «Если бы все были змеями, ног =». */
  blankLabel?: string;
}

// ─────────────────────────────────────────────────────────────
// Олимпиадная задача (привязана к теме и уровню)
// ─────────────────────────────────────────────────────────────

export interface OlympiadProblemV2 {
  id: string;
  themeId: string;
  level: OlympiadLevel;
  title: string;
  statement: string;
  /** Картинка/схема (геометрия, графы). Грузится в объектное хранилище. */
  imageUrl?: string;
  /** Эталонный финальный ответ (канонический вид). */
  expectedAnswer: string;
  /** Дополнительные принимаемые формы ответа. */
  acceptedAnswers?: string[];
  /** Нарастающие подсказки (каскад): hints[0] после 1-й ошибки и т.д. */
  hints: string[];
  rewardStars: number;
  /** Теги навыков мышления (для аналитики методиста). */
  skillTags: string[];
  /** Опорный контекст ответа для L4 — первые слова предложений. */
  answerScaffold?: string[];
  /** Число действий — показывается на L4. */
  actionCount?: number;
  /**
   * Структурированное решение (для guidedFull/guidedCompact/actionByAction).
   * У L5 (листочек) и L6 (алгебра) может отсутствовать.
   */
  steps?: OlympiadStep[];
  /**
   * ШАБЛОН РЕШЕНИЯ С ПРОПУСКАМИ (основной формат записи). Ребёнок заполняет
   * весь текст решения по пропускам — это и есть «запись решения», а не только ответ.
   * Если задан, раннер рендерит шаблон (а не steps).
   */
  template?: SolutionTemplate;
  /**
   * Задача «метод предположения» (Головы и ноги). Из этих данных раннер
   * генерирует экраны-шаги (условие → данные → пробный расчёт → сравнение →
   * запись решения словами). Поддержка снимается по уровню (ТЗ §9).
   */
  assumption?: AssumptionTask;
  /**
   * РАЗБОР (ТЗ §6) — показывается ПОСЛЕ завершения/провала, отдельно от подсказок.
   * Подсказки помогают думать до ответа; разбор учит оформлять решение после.
   */
  breakdown?: OlympiadBreakdown;
}

// ─────────────────────────────────────────────────────────────
// Шаблон решения с пропусками (ввод + карточки) — «запись решения»
// ─────────────────────────────────────────────────────────────

export type TemplateBlankKind = "number" | "expression" | "card" | "text";

export interface TemplateBlank {
  id: string;
  kind: TemplateBlankKind;
  /** Допустимые ответы (number/expression/text); accepted[0] — канон. */
  accepted?: string[];
  /** Карточки-варианты (для card); correct помечает верную. */
  options?: OlympiadStepOption[];
  /** Часть записи решения, в которую попадает этот пропуск (по умолчанию solutionSteps). */
  field?: SolutionField;
  placeholder?: string;
  hint?: string;
}

/** Сегмент шаблона: либо статичный текст, либо пропуск. */
export type TemplateSegment = { text: string } | { blank: TemplateBlank };

export interface SolutionTemplate {
  /** Необязательная вводная строка над текстом решения. */
  lead?: string;
  segments: TemplateSegment[];
}

// ─────────────────────────────────────────────────────────────
// «Метод предположения» (Головы и ноги): задача описывается ДАННЫМИ,
// экраны-шаги и проверка генерируются раннером (AssumptionRunner).
// ─────────────────────────────────────────────────────────────

export interface AssumptionParticipant {
  key: string;
  /** Множественное им. п.: «звери», «птицы». */
  label: string;
  /** Родительный/счётный: «зверей», «птиц» (для ответа). Если нет — label. */
  countLabel?: string;
  /** Ед. ч. для строки «один зверь добавляет…». */
  one?: string;
  icon?: string;
  /** Сколько «ног» (или колёс/лап) у одного. */
  legs: number;
}

export interface AssumptionTask {
  /** Ровно два вида. */
  participants: [AssumptionParticipant, AssumptionParticipant];
  totalHeads: number;
  totalLegs: number;
  /** Что считаем единицей «ног»: «ног», «колёс»… */
  legUnit?: string;
  /** Что считаем «головой»: «голов», «штук»… */
  headUnit?: string;
}

/**
 * Разбор задачи (worked solution). Структура по ТЗ §6:
 * что известно → идея → шаги → запись решения → ответ → проверка себя.
 */
export interface OlympiadBreakdown {
  known: string;
  idea: string;
  steps: string[];
  writtenSolution: string;
  answer: string;
  selfCheck: string;
}

// ─────────────────────────────────────────────────────────────
// Тема как узел карты мира
// ─────────────────────────────────────────────────────────────

export interface OlympiadTheme {
  id: string;
  title: string;
  /** Краткое описание темы (для карточки узла). */
  blurb: string;
  /** Иконка-эмодзи узла. */
  icon: string;
  /** Зависимости: тема открывается после прохождения этих тем. */
  dependsOn: string[];
  /** Какие уровни заведены у темы (L6 опционален и не во всех темах). */
  levels: OlympiadLevel[];
  /** Целевой уровень для значка «тема приручена». */
  masteryLevel: OlympiadLevel;
  skillTags: string[];
  /**
   * Мини-объяснение метода темы (ТЗ §7). Показывается по кнопке «Смотреть объяснение»
   * на экране темы — НЕ запускает задачу. Напр. для «Головы и ноги»:
   * «все одного вида → сравни → шаг замены → ответ».
   */
  method?: OlympiadMethod;
}

/** Объяснение метода темы для экрана «Смотреть объяснение» (ТЗ §7). */
export interface OlympiadMethod {
  /** Заголовок метода, напр. «Метод предположения». */
  title: string;
  /** Короткое вступление. */
  intro: string;
  /** Шаги метода в общем виде (без конкретных чисел). */
  steps: string[];
  /** Маленький пример «на пальцах». */
  example?: string;
}

// ─────────────────────────────────────────────────────────────
// Прогресс ребёнка по теме (живёт в БД; на пилоте — мок/клиент)
// ─────────────────────────────────────────────────────────────

export type ThemeState = "locked" | "open" | "inProgress" | "mastered";

export interface ThemeProgress {
  themeId: string;
  /** Текущий уровень ребёнка в теме. */
  currentLevel: OlympiadLevel;
  /** Решено верно ПОДРЯД на текущем уровне (для авто-перевода: 4 → уровень выше). */
  streak: number;
  /** Решено всего на текущем уровне. */
  solvedAtLevel: number;
  /** Подряд проваленных задач (для каскада: откат уровня + сигнал методисту). */
  consecutiveFails: number;
  /** Заработанные звёзды по теме. */
  stars: number;
  /** Получен ли значок (тема пройдена до masteryLevel). */
  badgeEarned: boolean;
  state: ThemeState;
}

// ─────────────────────────────────────────────────────────────
// Запись решения и попытка олимпиадного задания (ТЗ §1, §9)
// ─────────────────────────────────────────────────────────────

/** Пять частей записи решения. Ценится ход мысли, а не только ответ. */
export interface OlympiadSolutionRecord {
  selectedData: string; // что дано / что известно
  solutionPlan: string; // план решения
  solutionSteps: string; // шаги / вычисления
  reasoningText: string; // рассуждение «почему так»
  finalAnswer: string; // итоговый ответ
}

export type SolutionField = keyof OlympiadSolutionRecord;

export const SOLUTION_FIELD_LABELS: Record<SolutionField, string> = {
  selectedData: "Что дано",
  solutionPlan: "План",
  solutionSteps: "Шаги решения",
  reasoningText: "Рассуждение",
  finalAnswer: "Ответ",
};

/** Формат записи решения по уровням (ТЗ §5) — постепенно снимает поддержку. */
export type RecordingFormat =
  | "solution_fill_blanks" // L1: заполнить ключевые части по шаблону
  | "solution_plan_builder" // L2: план + шаги с сильной опорой
  | "reasoning_text_builder" // L3: сам собирает план и дописывает объяснение
  | "action_explanation_choice" // L4: действие → выражение → короткое «почему»
  | "full_written_solution"; // L5: фото листочка + ответ + проверка методиста

/** Полнота записи решения (ТЗ §1, §4). */
export type ReasoningCompleteness = "notChecked" | "incomplete" | "partial" | "complete";

export const COMPLETENESS_RANK: Record<ReasoningCompleteness, number> = {
  notChecked: 0,
  incomplete: 1,
  partial: 2,
  complete: 3,
};

/** Достигнута ли минимальная полнота уровня. */
export function meetsCompleteness(actual: ReasoningCompleteness, min: ReasoningCompleteness): boolean {
  return COMPLETENESS_RANK[actual] >= COMPLETENESS_RANK[min];
}

/** Какие части записи обязательны для каждого формата (для оценки полноты). */
export const REQUIRED_FIELDS: Record<RecordingFormat, SolutionField[]> = {
  solution_fill_blanks: ["solutionSteps", "finalAnswer"],
  solution_plan_builder: ["solutionPlan", "solutionSteps", "finalAnswer"],
  reasoning_text_builder: ["solutionPlan", "solutionSteps", "reasoningText", "finalAnswer"],
  action_explanation_choice: ["solutionSteps", "reasoningText", "finalAnswer"],
  full_written_solution: ["finalAnswer"], // остальное на листочке → проверяет методист
};

/** Оценить полноту записи решения по заполненным обязательным частям формата. */
export function computeReasoningCompleteness(
  rec: OlympiadSolutionRecord,
  format: RecordingFormat,
): ReasoningCompleteness {
  if (format === "full_written_solution") return "notChecked"; // структуру оценивает методист
  const req = REQUIRED_FIELDS[format];
  const filled = req.filter((f) => (rec[f] ?? "").trim().length > 0).length;
  if (filled === 0) return "incomplete";
  if (filled >= req.length) return "complete";
  return filled / req.length >= 0.5 ? "partial" : "incomplete";
}

/** Статус попытки (ТЗ §1). */
export type OlympiadAttemptStatus =
  | "inProgress"
  | "completed" // решено верно, запись полная, без подсказок
  | "completed_with_hint" // решено верно, но с подсказкой
  | "needs_reasoning_revision" // ответ верный, но запись решения неполная
  | "failed" // не решено в рамках попыток
  | "pendingReview"; // L5: ушло методисту (фото листочка)

/** Результат одного шага решения (ТЗ §2) — ничего не теряем. */
export interface OlympiadStepResult {
  stepId: string;
  /** Что ввёл/выбрал ребёнок (текст, число, выражение, id варианта, порядок через запятую). */
  value: string;
  /** L4: выбранный тип действия. */
  actionKind?: string;
  /** L4: короткое объяснение «почему» (или id выбранного объяснения). */
  explanation?: string;
  attempts: number;
  hintUsed: boolean;
  /** Была ли хотя бы одна неверная попытка на этом шаге. */
  hadError: boolean;
  /** Решено в итоге верно. */
  correct: boolean;
  /** Коды ошибок шага (напр. wrong_action_kind, wrong_value, wrong_order). */
  errorCodes?: string[];
}

/**
 * Полная попытка олимпиадного задания (ТЗ §1).
 * Сохраняется в БД — методист/отчёт видят, КАК ребёнок думал, а не только верность.
 */
export interface OlympiadTaskAttempt {
  problemId: string;
  themeId: string;
  level: OlympiadLevel;
  recordingFormat: RecordingFormat;
  // запись решения (5 частей)
  selectedData: string;
  solutionPlan: string;
  solutionSteps: string;
  reasoningText: string;
  finalAnswer: string;
  // структура шагов
  steps: OlympiadStepResult[];
  // агрегаты
  hintsUsed: number;
  attempts: number; // суммарно попыток по задаче (шаги + финальный ответ)
  errorCodes: string[];
  selfCorrection: boolean; // были ошибки, но в итоге исправил сам, без подсказки
  reasoningCompleteness: ReasoningCompleteness;
  status: OlympiadAttemptStatus;
  finalAnswerCorrect: boolean;
  /** L5: до 3 фото листочка. */
  uploadedSolutionUrls?: string[];
  rewardStars: number;
}
