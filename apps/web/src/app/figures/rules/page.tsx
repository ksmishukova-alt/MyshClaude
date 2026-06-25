"use client";

/** «Лист правил» — отдельная страница с лайфхаками раздела «Подсчёт фигур». */

import Link from "next/link";
import { genGrid, T } from "@/lib/figures";
import { FanFigure, GridFigure } from "@/components/figures/FigureView";
import "../figures.css";

function gridRecord(n: number) {
  const p = genGrid(n);
  const up = `(${p.upLadder.join("+")})`;
  const down = p.downLadder.length ? `(${p.downLadder.join("+")})` : "";
  return down ? `${up} + ${down} = ${p.total}` : `${up} = ${p.total}`;
}

export default function RulesPage() {
  const ladder = Array.from({ length: 8 }, (_, i) => ({ step: i + 1, val: T(i + 1) }));

  return (
    <main className="fig-stage" aria-label="Лист правил">
      <div className="fig-wrap">
        <header className="fig-top">
          <Link className="fig-back" href="/figures">← К заданиям</Link>
          <h1>Лист правил</h1>
        </header>
        <p className="fig-intro">Один признак → одно правило → все фигуры сразу. Не ищем глазами. 🪄</p>

        {/* ── ЭТАЖИ (ВЕЕР) ── */}
        <section className="rl-card">
          <h2 className="rl-h">📐 Этажи: лесенка комнат</h2>

          <div className="rl-ex">
            <div className="rl-fig"><FanFigure n={4} numberRooms /></div>
            <div className="rl-body">
              <div className="rl-tag">Пример 1 · просто комнаты</div>
              <p className="rl-rule">Сосчитай комнаты внизу и сложи подряд от 1.</p>
              <div className="rl-rec">4 комнаты → 1 + 2 + 3 + 4 = <b>10</b></div>
              <p className="rl-why">Каждый треугольник опирается на несколько комнат подряд — таких кусочков ровно 1+2+…+n.</p>
            </div>
          </div>

          <div className="rl-ex">
            <div className="rl-fig"><FanFigure n={3} floors={1} numberRooms /></div>
            <div className="rl-body">
              <div className="rl-tag">Пример 2 · комнаты с этажами</div>
              <p className="rl-rule">Каждый этаж считаем так же, как основание, и складываем по этажам.</p>
              <div className="rl-rec">основание: 1+2+3 = 6 &nbsp;·&nbsp; этаж: 1+2+3 = 6 → всего <b>6 + 6 = 12</b></div>
              <p className="rl-why">Горизонтальная линия даёт ещё один «пол»: на нём столько же треугольников, сколько на основании. Сколько уровней — столько раз и складываем.</p>
            </div>
          </div>

          <div className="rl-check">🤔 Проверь себя: сосчитал все комнаты? сложил подряд от 1? не забыл этажи?</div>
        </section>

        {/* ── СЕТКА ── */}
        <section className="rl-card">
          <h2 className="rl-h">🔺 Сетка: лесенка через одну</h2>

          <div className="rl-sub">Подготовительная лесенка</div>
          <p className="rl-text">Сначала строим один постоянный ряд — треугольные числа: складываем 1, потом 1+2, потом 1+2+3 и так далее.</p>
          <div className="rl-ladder">
            <table>
              <thead><tr><th>Ступенька</th>{ladder.map((l) => <th key={l.step}>{l.step}</th>)}</tr></thead>
              <tbody><tr><td>Число</td>{ladder.map((l) => <td key={l.step}>{l.val}</td>)}</tr></tbody>
            </table>
          </div>

          <div className="rl-sub">Постоянное правило</div>
          <p className="rl-rule">Вверх (▲) — берём все ступеньки подряд, начиная со ступеньки n.<br />Вниз (▼) — начинаем на одну ниже (со ступеньки n−1) и прыгаем через одну.</p>

          <div className="rl-ex">
            <div className="rl-fig"><GridFigure n={4} showDown /></div>
            <div className="rl-body">
              <div className="rl-tag">Разбор по сторонам</div>
              <ul className="rl-list">
                <li>Сторона 2: {gridRecord(2)}</li>
                <li>Сторона 3: {gridRecord(3)}</li>
                <li>Сторона 4: {gridRecord(4)}</li>
                <li>Сторона 5: {gridRecord(5)}</li>
                <li>Сторона 6: {gridRecord(6)}</li>
              </ul>
            </div>
          </div>

          <p className="rl-why">Почему «через одну»: каждый следующий перевёрнутый треугольник шире и забирает по одному месту с двух сторон — поэтому лесенка вниз уменьшается сразу на две ступеньки.</p>
          <div className="rl-check">🤔 Проверь себя: перевёрнутую лесенку начал на одну ниже? прыгал через одну?</div>
        </section>

        <div className="fig-actions">
          <Link className="fig-next" href="/figures">К заданиям →</Link>
        </div>
      </div>
    </main>
  );
}
