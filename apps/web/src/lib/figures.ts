/**
 * Раздел «Подсчёт фигур» — обучение через лайфхаки.
 *
 * Философия (важно): ребёнок НЕ ищет фигуры глазами. Он замечает один простой
 * признак рисунка и применяет один повторяемый приём:
 *   «посчитай вот эти очевидные элементы → сделай с ними вот это → получи всё сразу».
 *
 * Каждый лайфхак описывается единым шаблоном-карточкой (8 частей).
 */

export type FigKind = "fan" | "grid";
export type FigStage = "learn" | "train" | "solo";

/** Единый шаблон карточки-лайфхака. */
export interface Lifehack {
  kind: FigKind;
  name: string;            // название лайфхака
  whatToCount: string;     // что замечаем — один признак
  rule: string;            // короткое детское правило
  recordExample: string;   // как ребёнок запишет решение (пример)
  why: string;             // почему правило работает
  ladderExamples: string[];// лесенка примеров: просто → сложно
  boundary: string;        // граница применения
  selfCheck: string;       // вопрос самопроверки
}

/** k-е треугольное число (ступенька лесенки): 1,3,6,10,15,21… */
export const T = (k: number): number => (k * (k + 1)) / 2;

export const LIFEHACKS: Record<FigKind, Lifehack> = {
  fan: {
    kind: "fan",
    name: "Лесенка комнат",
    whatToCount: "Сколько «комнат» внизу — на сколько частей лучи делят основание.",
    rule: "Сложи подряд: 1 + 2 + 3 + … до числа комнат.",
    recordExample: "4 комнаты → 1 + 2 + 3 + 4 = 10",
    why: "Каждый треугольник опирается на несколько комнат подряд. Таких кусочков ровно 1 + 2 + … + n.",
    ladderExamples: ["2 комнаты → 1+2 = 3", "3 комнаты → 1+2+3 = 6", "4 комнаты → 1+2+3+4 = 10"],
    boundary: "Работает, когда все лучи выходят из одной вершины к основанию. Если добавлены горизонтальные линии — рисунок уже другой.",
    selfCheck: "Я сосчитал все комнаты? Сложил подряд, начиная с 1?",
  },
  grid: {
    kind: "grid",
    name: "Лесенка через одну",
    whatToCount: "Длину стороны большого треугольника — на сколько частей она поделена.",
    rule: "Вверх — все ступеньки подряд. Вниз — начни на одну ниже и прыгай через одну.",
    recordExample: "Сторона 6: (21+15+10+6+3+1) + (15+6+1) = 78",
    why: "Каждый следующий перевёрнутый треугольник шире и забирает по одному месту с двух сторон — поэтому лесенка вниз уменьшается сразу на две ступеньки.",
    ladderExamples: ["Сторона 3: (6+3+1)+(3) = 13", "Сторона 4: (10+6+3+1)+(6+1) = 27", "Сторона 5: (15+10+6+3+1)+(10+3) = 48"],
    boundary: "Работает для треугольной сетки из одинаковых треугольничков. Для других сеток приём другой.",
    selfCheck: "Я начал перевёрнутую лесенку на одну ниже? Прыгал через одну?",
  },
};

/** Сгенерированная задача-веер. */
export interface FanProblem {
  kind: "fan";
  n: number;            // число комнат
  addends: number[];    // [1,2,…,n]
  total: number;        // n(n+1)/2
}

export function genFan(n: number): FanProblem {
  const addends = Array.from({ length: n }, (_, i) => i + 1);
  return { kind: "fan", n, addends, total: (n * (n + 1)) / 2 };
}

/** Сгенерированная задача-сетка. */
export interface GridProblem {
  kind: "grid";
  n: number;            // длина стороны
  upLadder: number[];   // ступеньки вверх: T(n)…T(1)
  upSum: number;
  downLadder: number[]; // ступеньки вниз: T(n-1), T(n-3), …
  downSum: number;
  total: number;
}

export function genGrid(n: number): GridProblem {
  const upLadder: number[] = [];
  for (let k = n; k >= 1; k--) upLadder.push(T(k));
  const downLadder: number[] = [];
  for (let k = n - 1; k >= 1; k -= 2) downLadder.push(T(k));
  const upSum = upLadder.reduce((a, b) => a + b, 0);
  const downSum = downLadder.reduce((a, b) => a + b, 0);
  return { kind: "grid", n, upLadder, upSum, downLadder, downSum, total: upSum + downSum };
}

export type FigProblem = FanProblem | GridProblem;

/** Диапазоны сложности по стадиям. */
export const STAGE_RANGE: Record<FigKind, Record<FigStage, [number, number]>> = {
  fan: { learn: [3, 3], train: [3, 4], solo: [4, 6] },
  grid: { learn: [3, 3], train: [3, 4], solo: [4, 6] },
};

export function randIn([lo, hi]: [number, number]): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ── Геометрия для SVG ──────────────────────────────────────────────

export interface Pt { x: number; y: number }

/** Веер: вершина сверху, n комнат (n+1 точек по основанию), лучи из вершины. */
export function fanGeometry(n: number, w = 320, h = 240) {
  const apex: Pt = { x: w / 2, y: 22 };
  const baseY = h - 40;
  const x0 = 40, x1 = w - 40;
  const base: Pt[] = Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: baseY }));
  // комнаты (самые маленькие треугольники у основания)
  const rooms = Array.from({ length: n }, (_, i) => [apex, base[i], base[i + 1]] as [Pt, Pt, Pt]);
  return { apex, base, rooms, baseY };
}

/** Треугольная сетка стороны n: точки P[j][i], рёбра трёх семейств. */
export function gridGeometry(n: number, w = 320, h = 240) {
  const apex: Pt = { x: w / 2, y: 24 };
  const span = w - 100;          // ширина основания
  const rowH = (h - 64) / n;
  const half = span / n / 2;     // полушаг по горизонтали
  const P: Pt[][] = [];
  for (let j = 0; j <= n; j++) {
    const row: Pt[] = [];
    for (let i = 0; i <= j; i++) {
      row.push({ x: apex.x + (i - j / 2) * 2 * half, y: apex.y + j * rowH });
    }
    P.push(row);
  }
  const edges: [Pt, Pt][] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i <= j; i++) {
      edges.push([P[j][i], P[j + 1][i]]);       // левый наклон
      edges.push([P[j][i], P[j + 1][i + 1]]);   // правый наклон
    }
  }
  for (let j = 1; j <= n; j++) {
    for (let i = 0; i < j; i++) {
      edges.push([P[j][i], P[j][i + 1]]);        // горизонтали
    }
  }
  // пример одного перевёрнутого треугольника (для иллюстрации «вниз»)
  const downSample =
    n >= 2 ? ([P[1][0], P[1][1], P[2][1]] as [Pt, Pt, Pt]) : null;
  return { P, edges, apex, downSample };
}
