import type {
  DailySession,
  DailyTask,
  HomeScreenData,
  SubjectId,
  TaskContent,
  OlympiadProblem,
  ReviewItem,
  ChildProfile,
} from "@/types/domain";
import { isMyshroutkaEarned } from "@/types/domain";

/**
 * Мок-слой данных. Повторяет контракт будущего API (Supabase/Postgres).
 * Когда бэкенд будет готов, эти функции заменяются на fetch к API-роутам,
 * сигнатуры остаются те же — UI не меняется.
 */

const SUBJECT_SUMMARIES = [
  { subjectId: "math" as SubjectId, status: "successful" as const, tasksTotal: 2, tasksDone: 2 },
  { subjectId: "russian" as SubjectId, status: "submitted" as const, tasksTotal: 1, tasksDone: 1 },
  { subjectId: "reading" as SubjectId, status: "successful" as const, tasksTotal: 2, tasksDone: 2 },
  { subjectId: "english" as SubjectId, status: "notStarted" as const, tasksTotal: 1, tasksDone: 0 },
];

export function getHomeData(): HomeScreenData {
  const subjects = SUBJECT_SUMMARIES;
  const myshroutkaGranted = isMyshroutkaEarned(subjects);

  const session: DailySession = {
    id: "session-2026-06-15",
    childId: "child-artem",
    date: "2026-06-15",
    status: myshroutkaGranted ? "submitted" : "inProgress",
    subjects,
    myshroutkaGranted,
    submittedAt: null,
  };

  return {
    profile: { id: "child-artem", name: "Артём", grade: 3 },
    session,
    revisions: {
      count: 3,
      items: [
        { taskId: "t-m-1", subjectId: "math" },
        { taskId: "t-r-1", subjectId: "russian" },
        { taskId: "t-r-2", subjectId: "russian" },
      ],
    },
    stickers: { collected: 23, total: 120 },
    week: [
      { label: "Пн", mark: "done" },
      { label: "Вт", mark: "done" },
      { label: "Ср", mark: "done" },
      { label: "Чт", mark: "pending" },
      { label: "Пт", mark: "muted" },
    ],
  };
}

/** Список заданий по предмету за день (для /daily/[subject]). */
export function getSubjectTasks(subjectId: SubjectId): DailyTask[] {
  const byId: Record<SubjectId, DailyTask[]> = {
    math: [
      { id: "t-m-1", subjectId, title: "Сложение в пределах 100", mode: "platform", order: 1, estMinutes: 8, status: "successful" },
      { id: "t-m-2", subjectId, title: "Задача про конфеты", mode: "worksheet", order: 2, estMinutes: 10, status: "successful" },
    ],
    russian: [
      { id: "t-r-1", subjectId, title: "Безударные гласные", mode: "worksheet", order: 1, estMinutes: 8, status: "submitted" },
    ],
    reading: [
      { id: "t-rd-1", subjectId, title: "Читаем отрывок", mode: "platform", order: 1, estMinutes: 7, status: "successful" },
      { id: "t-rd-2", subjectId, title: "Дневник читателя · 30 минут", mode: "platform", order: 2, estMinutes: 30, status: "successful" },
    ],
    english: [
      { id: "t-e-1", subjectId, title: "Present Simple", mode: "platform", order: 1, estMinutes: 9, status: "notStarted" },
    ],
  };
  return byId[subjectId] ?? [];
}

/**
 * Содержимое конкретного задания (шаговая модель).
 * В реальном бэкенде — выборка из tasks/steps; здесь мок с теми же полями.
 */
const TASK_CONTENT: Record<string, TaskContent> = {
  // одношаговое: математика, выбор
  "t-m-1": {
    id: "t-m-1", subjectId: "math", title: "Сложение в пределах 100",
    mode: "platform", order: 1, total: 2, estMinutes: 8,
    prompt: "Реши пример.",
    steps: [
      {
        id: "s1", kind: "question",
        prompt: "Сколько будет 47 + 38?",
        hint: "Сложи десятки: 40 + 30 = 70. Потом единицы: 7 + 8 = 15. Сложи вместе.",
        options: [
          { id: "a", label: "75", isCorrect: false },
          { id: "b", label: "85", isCorrect: true },
          { id: "c", label: "95", isCorrect: false },
          { id: "d", label: "83", isCorrect: false },
        ],
      },
    ],
  },

  // листочек
  "t-m-2": {
    id: "t-m-2", subjectId: "math", title: "Задача про конфеты",
    mode: "worksheet", order: 2, total: 2, estMinutes: 10,
    prompt: "У Маши было 24 конфеты. Она разложила их поровну в 3 коробки, а потом добавила в каждую ещё по 2. Сколько конфет стало в каждой коробке? Реши на листочке и сфотографируй решение.",
  },

  "t-r-1": {
    id: "t-r-1", subjectId: "russian", title: "Безударные гласные",
    mode: "worksheet", order: 1, total: 1, estMinutes: 8,
    prompt: "Спиши и вставь пропущенные буквы, обозначь ударение: «гр_за, тр_ва, с_сна, в_лна». Сфотографируй листочек.",
  },

  // МНОГОШАГОВОЕ: чтение — текст + 2 вопроса + дневник
  "t-rd-1": {
    id: "t-rd-1", subjectId: "reading", title: "Понимаем прочитанное",
    mode: "platform", order: 1, total: 2, estMinutes: 10,
    prompt: "Прочитай отрывок и ответь на вопросы.",
    steps: [
      {
        id: "read", kind: "reading",
        prompt: "Шаг 1. Внимательно прочитай отрывок.",
        passage: "Мальчик стоял у калитки и смотрел на темнеющее небо. Дома ждал тёплый ужин, но он не торопился — хотелось досмотреть, как загорается первая звезда. Когда она наконец вспыхнула над крышей соседнего дома, мальчик улыбнулся и побежал домой.",
      },
      {
        id: "q1", kind: "question",
        prompt: "Шаг 2. Чего ждал мальчик у калитки?",
        passage: "Мальчик стоял у калитки и смотрел на темнеющее небо…",
        hint: "Перечитай, на что он смотрел и что хотел досмотреть.",
        options: [
          { id: "a", label: "Когда позовут ужинать", isCorrect: false },
          { id: "b", label: "Когда загорится первая звезда", isCorrect: true },
          { id: "c", label: "Когда придёт сосед", isCorrect: false },
        ],
      },
      {
        id: "q2", kind: "question",
        prompt: "Шаг 3. Что сделал мальчик, когда звезда вспыхнула?",
        hint: "Последнее предложение отрывка.",
        options: [
          { id: "a", label: "Улыбнулся и побежал домой", isCorrect: true },
          { id: "b", label: "Загадал желание", isCorrect: false },
          { id: "c", label: "Остался у калитки до утра", isCorrect: false },
        ],
      },
    ],
  },

  // дневник читателя — свободный ввод
  "t-rd-2": {
    id: "t-rd-2", subjectId: "reading", title: "Дневник читателя · 30 минут",
    mode: "platform", order: 2, total: 2, estMinutes: 30,
    prompt: "Запиши, что читаешь сегодня.",
    steps: [
      {
        id: "diary", kind: "question",
        prompt: "Напиши название книги и одно предложение о том, что понравилось.",
        correctInput: "",
        readingTimerMinutes: 30,
      },
    ],
  },

  // английский, выбор
  "t-e-1": {
    id: "t-e-1", subjectId: "english", title: "Present Simple",
    mode: "platform", order: 1, total: 1, estMinutes: 9,
    prompt: "Choose the correct form.",
    steps: [
      {
        id: "s1", kind: "question",
        prompt: "«She ___ to school every day.»",
        hint: "Present Simple, 3rd person singular → глагол получает -s/-es.",
        options: [
          { id: "a", label: "go", isCorrect: false },
          { id: "b", label: "goes", isCorrect: true },
          { id: "c", label: "going", isCorrect: false },
          { id: "d", label: "gone", isCorrect: false },
        ],
      },
    ],
  },
};

export function getTaskContent(taskId: string): TaskContent | null {
  return TASK_CONTENT[taskId] ?? null;
}

/** Следующее задание того же предмета (или null, если это последнее). */
export function getNextTaskId(subjectId: SubjectId, currentId: string): string | null {
  const tasks = getSubjectTasks(subjectId).sort((a, b) => a.order - b.order);
  const idx = tasks.findIndex((t) => t.id === currentId);
  if (idx === -1 || idx === tasks.length - 1) return null;
  return tasks[idx + 1].id;
}


const OLYMPIAD: Record<string, OlympiadProblem> = {
  "olymp-1": {
    id: "olymp-1",
    topicId: "logic",
    title: "Рыцари и лжецы",
    statement:
      "На острове живут рыцари (всегда говорят правду) и лжецы (всегда лгут). Встретились трое. А сказал: «Б — лжец». Б сказал: «В — лжец». В сказал: «А и Б оба лжецы». Сколько на самом деле рыцарей среди них?",
    hint: "Предположи, что А говорит правду, и проверь, не возникнет ли противоречие. Потом предположи обратное.",
    expectedAnswer: "1",
    rewardStars: 20,
  },
  "olymp-2": {
    id: "olymp-2",
    topicId: "parity",
    title: "Чётность суммы",
    statement:
      "На доске написаны числа от 1 до 10. Можно ли стереть несколько из них так, чтобы сумма оставшихся была равна 7? Если да — приведи пример, если нет — объясни почему.",
    hint: "Подумай о наименьшей возможной сумме, если оставить хотя бы одно число.",
    expectedAnswer: "да",
    rewardStars: 20,
  },
};

export function getOlympiadProblem(id: string): OlympiadProblem | null {
  return OLYMPIAD[id] ?? null;
}


// ─── Карта тем (олимпиадный маршрут) ───
export interface TopicIsland {
  id: string;
  title: string;
  problemId: string | null; // куда ведёт (олимп. задача) или null если закрыт
  stars: number;
  starsMax: number;
  state: "done" | "active" | "locked";
}

export function getTopicMap(): TopicIsland[] {
  return [
    { id: "logic", title: "Логика", problemId: "olymp-1", stars: 3, starsMax: 3, state: "done" },
    { id: "search", title: "Перебор", problemId: "olymp-1", stars: 2, starsMax: 3, state: "done" },
    { id: "parity", title: "Чётность", problemId: "olymp-2", stars: 2, starsMax: 3, state: "active" },
    { id: "dirichlet", title: "Принцип Дирихле", problemId: null, stars: 0, starsMax: 3, state: "locked" },
    { id: "geometry", title: "Геометрия", problemId: null, stars: 0, starsMax: 3, state: "locked" },
    { id: "final", title: "Финал", problemId: null, stars: 0, starsMax: 3, state: "locked" },
  ];
}

// ─── Доработки (детально) ───
export interface RevisionDetail {
  taskId: string;
  subjectId: SubjectId;
  title: string;
  feedback: string;
}

export function getRevisionDetails(): RevisionDetail[] {
  return [
    { taskId: "t-m-1", subjectId: "math", title: "Сложение в пределах 100", feedback: "Проверь разряд десятков ещё раз." },
    { taskId: "t-r-1", subjectId: "russian", title: "Безударные гласные", feedback: "Обозначь ударение во всех словах." },
    { taskId: "t-r-2", subjectId: "russian", title: "Правописание приставок", feedback: "Вспомни правило про приставки на з/с." },
  ];
}

// ─── Альбом наклеек ───
export interface Sticker {
  id: string;
  emoji: string;
  earned: boolean;
}

export function getStickerAlbum(): { collected: number; total: number; stickers: Sticker[] } {
  const earnedEmojis = ["⭐","🏆","🔢","📚","🎯","🧠","✏️","🦉","🚀","💡","🌟","🥇","📐","🔬","🎓","🧩","🏅","🦋","🌈","🎨","🦊","🐢","🍀"];
  const stickers: Sticker[] = [];
  const pool = ["⭐","🏆","🔢","📚","🎯","🧠","✏️","🦉","🚀","💡","🌟","🥇","📐","🔬","🎓","🧩","🏅","🦋","🌈","🎨","🦊","🐢","🍀","🎪","🎭","🎸","⚽","🏀","🎲","🧸"];
  for (let i = 0; i < 30; i++) {
    stickers.push({ id: `st-${i}`, emoji: pool[i % pool.length], earned: i < earnedEmojis.length });
  }
  return { collected: earnedEmojis.length, total: 120, stickers };
}




/** Профили детей в семье/группе (для экрана входа). PIN в моках — 4 цифры. */
export interface LoginProfile extends ChildProfile {
  shortCode: string;
  pin: string; // в реальности — bcrypt-хэш на сервере, не на клиенте
}

export function getLoginProfiles(): LoginProfile[] {
  return [
    { id: "child-artem", name: "Артём", grade: 3, shortCode: "MISH42", pin: "1234" },
    { id: "child-masha", name: "Маша", grade: 2, shortCode: "MISH88", pin: "0000" },
  ];
}

export function verifyChildLogin(childId: string, pin: string): boolean {
  const p = getLoginProfiles().find((x) => x.id === childId);
  return !!p && p.pin === pin;
}

export function findByShortCode(code: string): LoginProfile | null {
  return getLoginProfiles().find((x) => x.shortCode.toLowerCase() === code.toLowerCase()) ?? null;
}

// ─── Панель родителя: сводка прогресса и самостоятельности ───
export interface ParentChildSummary {
  childId: string;
  name: string;
  grade: number;
  /** % выполненных Daily за неделю */
  weekDailyDone: number;
  weekDailyTotal: number;
  /** средняя самостоятельность 0..1 (доля шагов решённых сам с 1-й попытки) */
  autonomy: number;
  stars: number;
  stickers: number;
  /** по предметам: статус последнего Daily */
  subjects: { subjectId: SubjectId; done: boolean }[];
  /** короткая лента активности */
  recent: { date: string; text: string }[];
}

export function getParentDashboard(): ParentChildSummary[] {
  return [
    {
      childId: "child-artem", name: "Артём", grade: 3,
      weekDailyDone: 4, weekDailyTotal: 5,
      autonomy: 0.82, stars: 245, stickers: 23,
      subjects: [
        { subjectId: "math", done: true },
        { subjectId: "russian", done: true },
        { subjectId: "reading", done: true },
        { subjectId: "english", done: false },
      ],
      recent: [
        { date: "Сегодня", text: "Прошёл Daily по математике без подсказок 💪" },
        { date: "Сегодня", text: "Отправил решение по русскому на проверку" },
        { date: "Вчера", text: "Собрал наклейку «Логика»" },
      ],
    },
    {
      childId: "child-masha", name: "Маша", grade: 2,
      weekDailyDone: 3, weekDailyTotal: 5,
      autonomy: 0.64, stars: 130, stickers: 11,
      subjects: [
        { subjectId: "math", done: true },
        { subjectId: "russian", done: false },
        { subjectId: "reading", done: true },
        { subjectId: "english", done: false },
      ],
      recent: [
        { date: "Сегодня", text: "Начала Daily по чтению" },
        { date: "Вчера", text: "Прошла олимпиадную задачу «Перебор»" },
      ],
    },
  ];
}


/** Очередь листочков на проверку (мок). */
export function getReviewQueue(): ReviewItem[] {
  return [
    {
      attemptId: "att-1", childId: "child-artem", childName: "Артём",
      taskId: "t-m-2", taskTitle: "Задача про конфеты", subjectId: "math",
      solutionUrl: "/myshmat-assets/revisions.png",
      submittedAt: "2026-06-16T08:30:00Z",
    },
    {
      attemptId: "att-2", childId: "child-artem", childName: "Артём",
      taskId: "t-r-1", taskTitle: "Безударные гласные", subjectId: "russian",
      solutionUrl: "/myshmat-assets/revisions.png",
      submittedAt: "2026-06-16T08:32:00Z",
    },
    {
      attemptId: "att-3", childId: "child-masha", childName: "Маша",
      taskId: "t-m-2", taskTitle: "Задача про конфеты", subjectId: "math",
      solutionUrl: "/myshmat-assets/revisions.png",
      submittedAt: "2026-06-16T09:05:00Z",
    },
  ];
}
