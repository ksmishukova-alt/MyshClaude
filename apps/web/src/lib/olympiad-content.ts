/**
 * Контент олимпиадного ядра: карта тем (узлы с зависимостями) и банк задач.
 *
 * Тема — единый узел, проходимый на глубину L1→L5/L6.
 * Флагман с полностью заведёнными уровнями — «Головы и ноги»
 * (свой раннер на тему: метод предположения, см. plan.md §3.1).
 *
 * На пилоте — мок-слой. Сигнатуры селекторов повторяют будущий репозиторий,
 * чтобы перенос на Supabase не менял UI (см. lib/data.ts как образец).
 */

import type {
  OlympiadTheme,
  OlympiadProblemV2,
  OlympiadLevel,
  ThemeProgress,
  AssumptionTask,
} from "@/types/olympiad";
import { clampLevel } from "@/lib/olympiad-progress";

// ─────────────────────────────────────────────────────────────
// Карта тем (узлы + зависимости)
// ─────────────────────────────────────────────────────────────

export const THEMES: OlympiadTheme[] = [
  {
    id: "logic",
    title: "Логика",
    blurb: "Рыцари и лжецы, истина и ложь, рассуждение от противного.",
    icon: "🧩",
    dependsOn: [],
    levels: ["L1", "L2", "L5"],
    masteryLevel: "L2",
    skillTags: ["логика", "от противного"],
  },
  {
    id: "search",
    title: "Перебор",
    blurb: "Аккуратно перебрать все случаи и ничего не пропустить.",
    icon: "🔎",
    dependsOn: ["logic"],
    levels: ["L1", "L2"],
    masteryLevel: "L2",
    skillTags: ["перебор", "систематичность"],
  },
  {
    id: "heads-legs",
    title: "Головы и ноги",
    blurb: "Метод предположения: «представим, что все одинаковые» и сравним.",
    icon: "🐰",
    dependsOn: ["search"],
    levels: ["L1", "L2", "L3", "L4", "L5"],
    masteryLevel: "L4",
    skillTags: ["метод предположения", "уравнивание"],
    method: {
      title: "Метод предположения",
      intro:
        "Когда есть два вида и известны «головы» и «ноги», удобно сначала представить, что все одного вида, а потом сравнить с настоящим числом ног.",
      steps: [
        "Предположи, что ВСЕ одного вида (обычно — у кого ног меньше).",
        "Посчитай, сколько было бы ног при таком предположении.",
        "Сравни с настоящим числом ног — найди разницу.",
        "Каждая замена одного вида на другой добавляет фиксированное число ног. Раздели разницу на эту «добавку» — получишь, сколько заменить.",
      ],
      example:
        "8 голов, 20 ног, зайцы(4)/змеи(0). Все змеи → 0 ног. Разница 20. Замена даёт +4. 20÷4 = 5 зайцев, значит 3 змеи.",
    },
  },
  {
    id: "parity",
    title: "Чётность",
    blurb: "Чёт и нечёт: когда раскраска и остаток решают задачу.",
    icon: "⚖️",
    dependsOn: ["logic"],
    levels: ["L1", "L5"],
    masteryLevel: "L1",
    skillTags: ["чётность", "инвариант"],
  },
  {
    id: "invariants",
    title: "Инварианты",
    blurb: "Что НЕ меняется при действиях — то и подсказывает ответ.",
    icon: "🔁",
    dependsOn: ["parity"],
    levels: ["L1", "L5"],
    masteryLevel: "L1",
    skillTags: ["инвариант"],
  },
  {
    id: "dirichlet",
    title: "Принцип Дирихле",
    blurb: "Если кроликов больше, чем клеток — где-то их двое.",
    icon: "🕳️",
    dependsOn: ["parity"],
    levels: ["L1"],
    masteryLevel: "L1",
    skillTags: ["Дирихле", "оценка"],
  },
  {
    id: "geometry",
    title: "Геометрия",
    blurb: "Разрезания, площади, симметрия на клетчатой бумаге.",
    icon: "📐",
    dependsOn: ["invariants"],
    levels: ["L1"],
    masteryLevel: "L1",
    skillTags: ["геометрия"],
  },
];

export function getThemes(): OlympiadTheme[] {
  return THEMES;
}

export function getTheme(themeId: string): OlympiadTheme | null {
  return THEMES.find((t) => t.id === themeId) ?? null;
}

// ─────────────────────────────────────────────────────────────
// Банк задач
// ─────────────────────────────────────────────────────────────

/**
 * Флагман «Головы и ноги» — метод предположения в 4 шага (см. plan.md §3.1):
 *  (1) кто участвует и сколько у кого ног;
 *  (2) сколько было бы ног, если бы все были «минимальные»;
 *  (3) сравнить с условием, найти разницу;
 *  (4) разделить разницу на (4−0) → столько «больших» животных.
 * На L1–L2 шаги с описаниями; на L3 — сжато (план + минимум подсказок);
 * на L4 — действие → выражение; на L5 — чистый лист.
 */
const HEADS_LEGS: OlympiadProblemV2[] = [
  // ── L1: типовая, ведём за руку ──
  {
    id: "hl-l1-1",
    themeId: "heads-legs",
    level: "L1",
    title: "Зайцы и змеи",
    statement:
      "В живом уголке сидят зайцы и змеи. Всего 8 голов и 20 ног. У зайца 4 лапы, у змеи лап нет (0). Сколько зайцев и сколько змей?",
    expectedAnswer: "5 зайцев, 3 змеи",
    acceptedAnswers: ["5 и 3", "зайцев 5 змей 3", "5 зайцев 3 змеи"],
    hints: [
      "Представь, что в уголке ВСЕ — змеи. Сколько тогда было бы ног?",
      "Ног на самом деле 20, а у «всех змей» — 0. Куда делась разница?",
      "Каждая замена змеи на зайца добавляет 4 ноги. Раздели разницу на 4.",
    ],
    rewardStars: 15,
    skillTags: ["метод предположения"],
    breakdown: {
      known: "8 голов (всего животных), 20 ног. У зайца 4 лапы, у змеи 0.",
      idea: "Предположим, что все — змеи (у них ног меньше), и сравним с настоящими 20 ногами.",
      steps: [
        "Все 8 — змеи: ног 8 × 0 = 0.",
        "Разница с настоящими: 20 − 0 = 20.",
        "Замена змеи на зайца добавляет 4 ноги: 20 ÷ 4 = 5 зайцев.",
        "Змей: 8 − 5 = 3.",
      ],
      writtenSolution: "Пусть все змеи → 0 ног. Не хватает 20 ног. Каждый заяц добавляет 4: 20 ÷ 4 = 5 зайцев, 8 − 5 = 3 змеи.",
      answer: "5 зайцев и 3 змеи.",
      selfCheck: "Проверь: 5 × 4 + 3 × 0 = 20 ног и 5 + 3 = 8 голов. Сходится!",
    },
    steps: [
      {
        id: "s1",
        title: "Представь, что ВСЕ — змеи. Сколько тогда всего ног?",
        guidance:
          "У змеи 0 ног. Если бы все 8 голов были змеями, ног было бы 8 × 0 = 0.",
        blankLabel: "Если бы все были змеями, ног =",
        kind: "number",
        accepted: ["0"],
        hint: "8 змей × 0 ног = 0.",
      },
      {
        id: "s2",
        title: "На сколько это меньше, чем на самом деле?",
        guidance: "На самом деле ног 20. Разница: 20 − 0 = 20.",
        kind: "number",
        accepted: ["20"],
        hint: "20 − 0 = 20.",
      },
      {
        id: "s3",
        title: "Замена змеи на зайца добавляет 4 ноги. Сколько зайцев нужно?",
        guidance: "Разницу 20 делим на 4: 20 ÷ 4 = 5. Значит зайцев 5.",
        kind: "expression",
        accepted: ["20 / 4", "20÷4", "5"],
        hint: "20 ÷ 4 = ?",
      },
      {
        id: "s4",
        title: "Сколько тогда змей?",
        guidance: "Всего голов 8. Змей: 8 − 5 = 3.",
        kind: "number",
        accepted: ["3"],
        hint: "8 − 5 = 3.",
      },
    ],
  },

  // ── L2: тот же метод, нетиповые числа (0 → 2 ноги) ──
  {
    id: "hl-l2-1",
    themeId: "heads-legs",
    level: "L2",
    title: "Овцы и гуси",
    statement:
      "На лугу пасутся овцы (4 ноги) и гуси (2 ноги). Всего 10 голов и 28 ног. Сколько овец и сколько гусей?",
    expectedAnswer: "4 овцы, 6 гусей",
    acceptedAnswers: ["4 и 6", "овец 4 гусей 6", "4 овцы 6 гусей"],
    hints: [
      "Представь, что все 10 — гуси (по 2 ноги). Сколько ног получится?",
      "Сравни с настоящими 28 ногами — найди разницу.",
      "Замена гуся на овцу добавляет 4 − 2 = 2 ноги. Раздели разницу на 2.",
    ],
    rewardStars: 18,
    skillTags: ["метод предположения"],
    steps: [
      {
        id: "s1",
        title: "Пусть все 10 — гуси. Сколько всего ног?",
        guidance: "Гусь — 2 ноги. 10 × 2 = 20.",
        kind: "expression",
        accepted: ["10 * 2", "10×2", "20"],
        hint: "10 × 2 = ?",
      },
      {
        id: "s2",
        title: "Какая разница с настоящими 28 ногами?",
        guidance: "28 − 20 = 8.",
        kind: "number",
        accepted: ["8"],
        hint: "28 − 20.",
      },
      {
        id: "s3",
        title: "Замена гуся на овцу добавляет сколько ног?",
        guidance: "У овцы 4, у гуся 2. Разница 4 − 2 = 2 ноги за замену.",
        kind: "number",
        accepted: ["2"],
        hint: "4 − 2.",
      },
      {
        id: "s4",
        title: "Сколько овец? А гусей?",
        guidance: "Овец: 8 ÷ 2 = 4. Гусей: 10 − 4 = 6.",
        kind: "expression",
        accepted: ["8 / 2", "8÷2", "4"],
        hint: "Раздели разницу 8 на 2.",
      },
    ],
  },

  // ── L3: сжатый раннер — сам расставь план, минимум подсказок ──
  {
    id: "hl-l3-1",
    themeId: "heads-legs",
    level: "L3",
    title: "Машины и мотоциклы",
    statement:
      "На стоянке машины (4 колеса) и мотоциклы (2 колеса). Всего 7 транспортных средств и 22 колеса. Сколько машин?",
    expectedAnswer: "4 машины",
    acceptedAnswers: ["4", "4 машины 3 мотоцикла", "машин 4"],
    hints: ["Предположи, что все — мотоциклы, и сравни число колёс."],
    rewardStars: 22,
    skillTags: ["метод предположения", "план"],
    steps: [
      {
        id: "plan",
        title: "Сначала расставь план решения по порядку",
        kind: "order",
        options: [
          { id: "a", label: "Предположить, что все — мотоциклы" },
          { id: "b", label: "Посчитать колёса при этом предположении" },
          { id: "c", label: "Найти разницу с настоящим числом колёс" },
          { id: "d", label: "Разделить разницу на «добавку» за замену" },
        ],
        correctOrder: ["a", "b", "c", "d"],
      },
      {
        id: "s1",
        title: "Все 7 — мотоциклы: сколько колёс?",
        kind: "number",
        accepted: ["14"],
      },
      {
        id: "s2",
        title: "Разница с 22 колёсами?",
        kind: "number",
        accepted: ["8"],
      },
      {
        id: "s3",
        title: "Сколько машин? (замена добавляет 2 колеса)",
        kind: "number",
        accepted: ["4"],
      },
    ],
  },

  // ── L4: действие → выражение, без подсказок, виден счётчик действий ──
  {
    id: "hl-l4-1",
    themeId: "heads-legs",
    level: "L4",
    title: "Пауки и жуки",
    statement:
      "В коробке пауки (8 ног) и жуки (6 ног). Всего 12 насекомых и 84 ноги. Сколько пауков?",
    expectedAnswer: "6 пауков",
    acceptedAnswers: ["6", "6 пауков 6 жуков", "пауков 6"],
    hints: [],
    rewardStars: 28,
    skillTags: ["метод предположения", "самостоятельный план"],
    actionCount: 3,
    answerScaffold: ["Пауков —", "значит, жуков —"],
    breakdown: {
      known: "12 насекомых, 84 ноги. У паука 8 ног, у жука 6.",
      idea: "Предположим, что все — жуки (по 6 ног), и сравним с настоящими 84.",
      steps: [
        "Все 12 — жуки: 12 × 6 = 72 ноги.",
        "Разница: 84 − 72 = 12 ног.",
        "Замена жука на паука добавляет 8 − 6 = 2 ноги: 12 ÷ 2 = 6 пауков.",
      ],
      writtenSolution: "Все жуки → 72 ноги. Не хватает 12. Каждый паук добавляет 2: 12 ÷ 2 = 6 пауков, жуков тоже 6.",
      answer: "6 пауков (и 6 жуков).",
      selfCheck: "6 × 8 + 6 × 6 = 48 + 36 = 84 ноги, 6 + 6 = 12. Верно!",
    },
    steps: [
      {
        id: "a1",
        title: "Действие 1 — посчитай ноги, если бы все были жуками",
        kind: "expression",
        accepted: ["12 * 6", "12×6", "72"],
        actionKindOptions: ["сложение", "вычитание", "умножение", "деление"],
        actionKind: "умножение",
        explainOptions: [
          { id: "a", label: "12 жуков по 6 ног — это умножение", correct: true },
          { id: "b", label: "Складываю головы и ноги" },
          { id: "c", label: "Делю ноги на головы" },
        ],
      },
      {
        id: "a2",
        title: "Действие 2 — на сколько ног не хватило",
        kind: "expression",
        accepted: ["84 - 72", "12"],
        actionKindOptions: ["сложение", "вычитание", "умножение", "деление"],
        actionKind: "вычитание",
        explainOptions: [
          { id: "a", label: "Из настоящих ног вычитаю предположенные", correct: true },
          { id: "b", label: "Складываю обе суммы ног" },
        ],
      },
      {
        id: "a3",
        title: "Действие 3 — сколько пауков",
        kind: "expression",
        accepted: ["12 / 2", "12÷2", "6"],
        actionKindOptions: ["сложение", "вычитание", "умножение", "деление"],
        actionKind: "деление",
        explainOptions: [
          { id: "a", label: "Разницу делю на «добавку» за замену (2 ноги)", correct: true },
          { id: "b", label: "Разницу умножаю на 2" },
        ],
      },
    ],
  },

  // ── L5: чистый лист, олимпиадный формат ──
  {
    id: "hl-l5-1",
    themeId: "heads-legs",
    level: "L5",
    title: "Велосипеды, машины и трёхколёсные",
    statement:
      "Во дворе стоят велосипеды (2 колеса), машины (4 колеса) и трёхколёсные самокаты (3 колеса). Всего 10 штук и 29 колёс, причём велосипедов вдвое больше, чем машин. Сколько каждого вида? Реши на листочке, сфотографируй решение и впиши ответ.",
    expectedAnswer: "4 велосипеда, 2 машины, 4 самоката",
    acceptedAnswers: ["4 2 4", "велосипедов 4 машин 2 самокатов 4"],
    hints: [],
    rewardStars: 40,
    skillTags: ["метод предположения", "система условий", "самостоятельность"],
  },
];

const LOGIC: OlympiadProblemV2[] = [
  {
    id: "logic-l1-1",
    themeId: "logic",
    level: "L1",
    title: "Рыцари и лжецы",
    statement:
      "На острове рыцари всегда говорят правду, а лжецы всегда лгут. Встретились трое. А сказал: «Б — лжец». Б сказал: «В — лжец». В сказал: «А и Б оба лжецы». Сколько среди них рыцарей?",
    expectedAnswer: "1",
    acceptedAnswers: ["1 рыцарь", "один"],
    hints: [
      "Предположи, что В говорит правду. Тогда А и Б — лжецы. Нет ли противоречия?",
      "Если В — лжец, то неверно, что «А и Б оба лжецы» — значит хотя бы один из них рыцарь.",
    ],
    rewardStars: 16,
    skillTags: ["логика", "от противного"],
    steps: [
      {
        id: "s1",
        title: "Предположим, что В — рыцарь (говорит правду). Кто тогда А и Б?",
        guidance: "Если В прав, то «А и Б оба лжецы» — правда. Значит и А, и Б лжецы.",
        kind: "choice",
        options: [
          { id: "a", label: "Оба лжецы", correct: true },
          { id: "b", label: "Оба рыцари" },
          { id: "c", label: "Один рыцарь, один лжец" },
        ],
        hint: "В утверждает: «А и Б оба лжецы».",
      },
      {
        id: "s2",
        title: "А — лжец и сказал «Б — лжец». Значит Б на самом деле…",
        guidance: "Лжец лжёт, поэтому правда обратна: Б — рыцарь. Но мы предположили, что Б лжец — противоречие!",
        kind: "choice",
        options: [
          { id: "a", label: "Рыцарь — противоречие с предположением", correct: true },
          { id: "b", label: "Лжец — всё сходится" },
        ],
        hint: "Лжец говорит неправду, значит обратное его словам — истина.",
      },
      {
        id: "s3",
        title: "Значит В — лжец. Сколько всего рыцарей среди троих?",
        guidance: "Разбор показывает: рыцарь ровно один (это Б).",
        kind: "number",
        accepted: ["1"],
        hint: "Проверь: только Б оказывается рыцарем.",
      },
    ],
  },
  {
    id: "logic-l5-1",
    themeId: "logic",
    level: "L5",
    title: "Кто разбил вазу",
    statement:
      "Трое детей. Ровно один разбил вазу и ровно один соврал. Аня: «Я не била». Боря: «Это Аня». Вера: «Это не я». Кто разбил вазу? Реши на листочке и впиши ответ.",
    expectedAnswer: "Вера",
    acceptedAnswers: ["вера", "вазу разбила вера"],
    hints: [],
    rewardStars: 36,
    skillTags: ["логика", "перебор случаев"],
  },
];

const PARITY: OlympiadProblemV2[] = [
  {
    id: "parity-l1-1",
    themeId: "parity",
    level: "L1",
    title: "Сумма 1..10",
    statement:
      "На доске числа от 1 до 10. Можно ли стереть несколько так, чтобы сумма оставшихся равнялась 7? Если да — приведи пример (впиши оставшиеся числа), если нет — напиши «нет».",
    expectedAnswer: "7",
    acceptedAnswers: ["3 4", "1 2 4", "2 5", "1 6", "3 4 ", "7 "],
    hints: [
      "Какая самая маленькая сумма, если оставить только одно число?",
      "Можно оставить, например, числа 3 и 4 — их сумма 7.",
    ],
    rewardStars: 14,
    skillTags: ["чётность", "сумма"],
    steps: [
      {
        id: "s1",
        title: "Можно ли получить сумму 7?",
        guidance: "Да: оставим только числа, дающие в сумме 7, остальные сотрём.",
        kind: "choice",
        options: [
          { id: "a", label: "Да, можно", correct: true },
          { id: "b", label: "Нет, невозможно" },
        ],
        hint: "Попробуй оставить 3 и 4.",
      },
      {
        id: "s2",
        title: "Впиши пример оставшихся чисел (через пробел)",
        guidance: "Например, 3 и 4: 3 + 4 = 7.",
        kind: "number",
        accepted: ["3 4", "1 2 4", "2 5", "1 6", "7"],
        hint: "3 + 4 = 7.",
      },
    ],
  },
];

// ── «Звери и птицы» по методу предположения на всех уровнях (эталон, ТЗ §9) ──
// Одни данные (30 голов, 100 ног; звери 4, птицы 2) — раннер генерирует экраны,
// поддержка снимается по уровню (L1 авто-подсказки → L5 листок).
const ZVERI_PTICY_BREAKDOWN = {
  known: "30 голов, 100 ног. У зверя 4 ноги, у птицы 2.",
  idea: "Представим, что все — птицы (у них ног меньше), и сравним со 100.",
  steps: [
    "Все 30 — птицы: 30 × 2 = 60 ног.",
    "Не хватает: 100 − 60 = 40 ног.",
    "Зверь добавляет 4 − 2 = 2 ноги: 40 ÷ 2 = 20 зверей.",
    "Птиц: 30 − 20 = 10.",
  ],
  writtenSolution: "Все птицы → 60 ног. Не хватает 40. Каждый зверь добавляет 2: 40 ÷ 2 = 20 зверей, 30 − 20 = 10 птиц.",
  answer: "20 зверей и 10 птиц.",
  selfCheck: "20 × 4 + 10 × 2 = 80 + 20 = 100 ног, 20 + 10 = 30 голов. Сходится!",
};
const ZVERI_PTICY_ASSUMPTION: AssumptionTask = {
  participants: [
    { key: "zveri", label: "звери", countLabel: "зверей", one: "зверь", icon: "🦁", legs: 4 },
    { key: "ptici", label: "птицы", countLabel: "птиц", one: "птица", icon: "🐦", legs: 2 },
  ],
  totalHeads: 30,
  totalLegs: 100,
  legUnit: "ног",
  headUnit: "голов",
};
const ZP_STATEMENT =
  "В зоопарке живут четвероногие звери и двуногие птицы. В зоопарке 30 голов и 100 ног. Сколько зверей и сколько птиц живёт в зоопарке?";
const ZP_HINTS = [
  "Представь, что все 30 — птицы (у них ног меньше). Сколько тогда ног?",
  "Сравни с 100 — на сколько не хватает?",
  "Один зверь добавляет 4 − 2 = 2 ноги. Раздели разницу на 2.",
];
type Kind = { key: string; label: string; countLabel: string; one: string; icon: string; legs: number };
/** Построить задачу метода предположения с авто-разбором (big — у кого ног больше). */
function mkHL(o: {
  id: string; level: OlympiadLevel; reward: number; title: string; statement: string;
  big: Kind; small: Kind; heads: number; legs: number;
}): OlympiadProblemV2 {
  const { big, small, heads, legs } = o;
  const trial = heads * small.legs;
  const gap = legs - trial;
  const delta = big.legs - small.legs;
  const bigC = gap / delta;
  const smallC = heads - bigC;
  return {
    id: o.id, themeId: "heads-legs", level: o.level, title: o.title, statement: o.statement,
    expectedAnswer: `${bigC} ${big.countLabel}, ${smallC} ${small.countLabel}`,
    acceptedAnswers: [`${bigC} и ${smallC}`, `${bigC} ${big.countLabel} ${smallC} ${small.countLabel}`],
    hints: [
      `Представь, что все ${heads} — ${small.label} (у них ног меньше). Сколько тогда ног?`,
      `Сравни с ${legs} — на сколько не хватает?`,
      `Один «${big.one}» добавляет ${big.legs} − ${small.legs} = ${delta}. Раздели разницу на ${delta}.`,
    ],
    rewardStars: o.reward,
    skillTags: ["метод предположения", "уравнивание"],
    assumption: {
      participants: [
        { key: big.key, label: big.label, countLabel: big.countLabel, one: big.one, icon: big.icon, legs: big.legs },
        { key: small.key, label: small.label, countLabel: small.countLabel, one: small.one, icon: small.icon, legs: small.legs },
      ],
      totalHeads: heads, totalLegs: legs, legUnit: "ног", headUnit: "голов",
    },
    breakdown: {
      known: `${heads} голов, ${legs} ног. У «${big.one}» ${big.legs}, у «${small.one}» ${small.legs}.`,
      idea: `Представим, что все — ${small.label} (у них ног меньше), и сравним с ${legs}.`,
      steps: [
        `Все ${heads} — ${small.label}: ${heads} × ${small.legs} = ${trial} ног.`,
        `Не хватает: ${legs} − ${trial} = ${gap} ног.`,
        `«${big.one}» добавляет ${big.legs} − ${small.legs} = ${delta}: ${gap} ÷ ${delta} = ${bigC}.`,
        `«${small.label}»: ${heads} − ${bigC} = ${smallC}.`,
      ],
      writtenSolution: `Все ${small.label} → ${trial} ног. Не хватает ${gap}. Каждый «${big.one}» добавляет ${delta}: ${gap} ÷ ${delta} = ${bigC}, ${heads} − ${bigC} = ${smallC}.`,
      answer: `${bigC} ${big.countLabel} и ${smallC} ${small.countLabel}.`,
      selfCheck: `${bigC} × ${big.legs} + ${smallC} × ${small.legs} = ${legs} ног, ${bigC} + ${smallC} = ${heads} голов. Сходится!`,
    },
  };
}

const K = {
  zveri: { key: "zveri", label: "звери", countLabel: "зверей", one: "зверь", icon: "🦁", legs: 4 },
  ptici: { key: "ptici", label: "птицы", countLabel: "птиц", one: "птица", icon: "🐦", legs: 2 },
  kury: { key: "kury", label: "куры", countLabel: "кур", one: "курица", icon: "🐔", legs: 2 },
  kroliki: { key: "kroliki", label: "кролики", countLabel: "кроликов", one: "кролик", icon: "🐰", legs: 4 },
  gusi: { key: "gusi", label: "гуси", countLabel: "гусей", one: "гусь", icon: "🦢", legs: 2 },
  ovcy: { key: "ovcy", label: "овцы", countLabel: "овец", one: "овца", icon: "🐑", legs: 4 },
  zhuki: { key: "zhuki", label: "жуки", countLabel: "жуков", one: "жук", icon: "🪲", legs: 6 },
  pauki: { key: "pauki", label: "пауки", countLabel: "пауков", one: "паук", icon: "🕷️", legs: 8 },
};

// Лента «Головы и ноги»: РАЗНЫЕ задачи растущей сложности (A+C).
// Стадии: L1–L2 «Учусь», L3–L4 «Тренируюсь», L5 «Решаю сам». Опора убывает по уровню.
const HEADS_LEGS_V2: OlympiadProblemV2[] = [
  {
    id: "hl-l1-1", themeId: "heads-legs", level: "L1", title: "Звери и птицы",
    statement: ZP_STATEMENT, expectedAnswer: "20 зверей, 10 птиц",
    acceptedAnswers: ["20 и 10", "20 зверей 10 птиц", "зверей 20 птиц 10"],
    hints: ZP_HINTS, rewardStars: 15, skillTags: ["метод предположения", "уравнивание"],
    assumption: ZVERI_PTICY_ASSUMPTION, breakdown: ZVERI_PTICY_BREAKDOWN,
  },
  mkHL({ id: "hl-l2-1", level: "L2", reward: 18, title: "Куры и кролики",
    statement: "Во дворе куры и кролики. Всего 8 голов и 22 ноги. Сколько кур и сколько кроликов?",
    big: K.kroliki, small: K.kury, heads: 8, legs: 22 }),
  mkHL({ id: "hl-l3-1", level: "L3", reward: 22, title: "Овцы и гуси",
    statement: "На лугу пасутся овцы (4 ноги) и гуси (2 ноги). Всего 10 голов и 28 ног. Сколько овец и сколько гусей?",
    big: K.ovcy, small: K.gusi, heads: 10, legs: 28 }),
  mkHL({ id: "hl-l4-1", level: "L4", reward: 28, title: "Пауки и жуки",
    statement: "В коробке пауки (8 ног) и жуки (6 ног). Всего 12 насекомых и 84 ноги. Сколько пауков и сколько жуков?",
    big: K.pauki, small: K.zhuki, heads: 12, legs: 84 }),
  mkHL({ id: "hl-l5-1", level: "L5", reward: 40, title: "Пауки и жуки (листочек)",
    statement: "В террариуме пауки (8 ног) и жуки (6 ног). Всего 20 голов и 136 ног. Сколько каждого? Реши на листочке, сфотографируй и впиши ответ.",
    big: K.pauki, small: K.zhuki, heads: 20, legs: 136 }),
];

const BANK: Record<string, OlympiadProblemV2> = {};
// HEADS_LEGS_V2 (по методу предположения) перекрывает старые демо-id того же уровня.
for (const p of [...HEADS_LEGS, ...HEADS_LEGS_V2, ...LOGIC, ...PARITY]) BANK[p.id] = p;

export function getProblem(id: string): OlympiadProblemV2 | null {
  return BANK[id] ?? null;
}

/** Задачи темы на конкретном уровне (по порядку появления в банке). */
export function getProblemsByThemeLevel(themeId: string, level: OlympiadLevel): OlympiadProblemV2[] {
  return Object.values(BANK).filter((p) => p.themeId === themeId && p.level === level);
}

/** Первая задача темы на уровне (точка входа в «игру темы»). */
export function getFirstProblem(themeId: string, level: OlympiadLevel): OlympiadProblemV2 | null {
  return getProblemsByThemeLevel(themeId, level)[0] ?? null;
}

/** Все задачи темы, сгруппированные по уровню (для экрана прохождения темы). */
export function getProblemsByTheme(themeId: string): Record<string, OlympiadProblemV2[]> {
  const byLevel: Record<string, OlympiadProblemV2[]> = {};
  for (const p of Object.values(BANK)) {
    if (p.themeId !== themeId) continue;
    (byLevel[p.level] ??= []).push(p);
  }
  return byLevel;
}

// ─────────────────────────────────────────────────────────────
// Прогресс (мок-сид; на проде — из БД по childId)
// ─────────────────────────────────────────────────────────────

/**
 * Демо-прогресс ребёнка. Открытость темы вычисляется из зависимостей:
 * тема открыта, если все dependsOn пройдены (mastered) либо зависимостей нет.
 */
const SEED: Record<string, Partial<ThemeProgress>> = {
  logic: { currentLevel: "L2", streak: 1, solvedAtLevel: 3, stars: 48, badgeEarned: true, state: "mastered" },
  search: { currentLevel: "L1", streak: 2, solvedAtLevel: 2, stars: 20, state: "inProgress" },
  "heads-legs": { currentLevel: "L1", streak: 0, solvedAtLevel: 0, stars: 0, state: "open" },
};

function defaultProgress(theme: OlympiadTheme): ThemeProgress {
  return {
    themeId: theme.id,
    currentLevel: theme.levels[0],
    streak: 0,
    solvedAtLevel: 0,
    consecutiveFails: 0,
    stars: 0,
    badgeEarned: false,
    state: "locked",
  };
}

/** Прогресс по всем темам с учётом зависимостей (открытие узлов). */
export function getThemeProgressMap(): Record<string, ThemeProgress> {
  const map: Record<string, ThemeProgress> = {};
  for (const theme of THEMES) {
    const base = defaultProgress(theme);
    const seed = SEED[theme.id];
    const merged: ThemeProgress = seed
      ? { ...base, ...seed, currentLevel: clampLevel(seed.currentLevel ?? base.currentLevel, theme.levels) }
      : base;
    map[theme.id] = merged;
  }
  // Открыть темы, у которых все зависимости пройдены.
  for (const theme of THEMES) {
    const p = map[theme.id];
    if (p.state !== "locked") continue;
    const ready = theme.dependsOn.every((dep) => map[dep]?.badgeEarned);
    if (ready) p.state = "open";
  }
  return map;
}

export function getThemeProgress(themeId: string): ThemeProgress {
  return getThemeProgressMap()[themeId] ?? defaultProgress(getTheme(themeId)!);
}
