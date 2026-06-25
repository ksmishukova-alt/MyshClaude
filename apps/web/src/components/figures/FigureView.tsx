"use client";

/** SVG-фигуры для раздела «Подсчёт фигур»: веер (этажи) и треугольная сетка. */

import { fanGeometry, gridGeometry } from "@/lib/figures";

const W = 320, H = 240;

/** Веер: лучи из одной вершины делят основание на n «комнат». */
export function FanFigure({ n, numberRooms = false }: { n: number; numberRooms?: boolean }) {
  const g = fanGeometry(n, W, H);
  const outer = `${g.apex.x},${g.apex.y} ${g.base[0].x},${g.base[0].y} ${g.base[n].x},${g.base[n].y}`;
  return (
    <svg className="fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Веер из ${n} комнат`}>
      <polygon points={outer} fill="#eaf4ff" stroke="#1f6fd0" strokeWidth={3} strokeLinejoin="round" />
      {numberRooms &&
        g.rooms.map((r, i) => (
          <polygon key={`r${i}`} points={r.map((p) => `${p.x},${p.y}`).join(" ")} fill={i % 2 ? "#cfe6ff" : "#dcedff"} opacity={0.7} />
        ))}
      {g.base.map((p, i) => (
        <line key={`c${i}`} x1={g.apex.x} y1={g.apex.y} x2={p.x} y2={p.y} stroke="#1f6fd0" strokeWidth={i === 0 || i === n ? 3 : 2} />
      ))}
      <line x1={g.base[0].x} y1={g.baseY} x2={g.base[n].x} y2={g.baseY} stroke="#1f6fd0" strokeWidth={3} />
      {numberRooms &&
        g.rooms.map((r, i) => (
          <text key={`t${i}`} x={(r[1].x + r[2].x) / 2} y={g.baseY - 12} textAnchor="middle" className="fig-roomnum">{i + 1}</text>
        ))}
      {g.base.map((p, i) => (
        <circle key={`p${i}`} cx={p.x} cy={p.y} r={3.5} fill="#1f6fd0" />
      ))}
    </svg>
  );
}

/** Треугольная сетка стороны n. */
export function GridFigure({ n, showDown = false }: { n: number; showDown?: boolean }) {
  const g = gridGeometry(n, W, H);
  const outer = `${g.P[0][0].x},${g.P[0][0].y} ${g.P[n][0].x},${g.P[n][0].y} ${g.P[n][n].x},${g.P[n][n].y}`;
  return (
    <svg className="fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Треугольная сетка стороны ${n}`}>
      <polygon points={outer} fill="#eafaef" stroke="#2fad50" strokeWidth={3} strokeLinejoin="round" />
      {showDown && g.downSample && (
        <polygon points={g.downSample.map((p) => `${p.x},${p.y}`).join(" ")} fill="#ffd2e1" opacity={0.85} />
      )}
      {g.edges.map((e, i) => (
        <line key={i} x1={e[0].x} y1={e[0].y} x2={e[1].x} y2={e[1].y} stroke="#2fad50" strokeWidth={1.6} opacity={0.85} />
      ))}
      <polygon points={outer} fill="none" stroke="#1f8a3f" strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
}
