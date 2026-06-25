"use client";

/**
 * Прототип раздела «Подсчёт фигур». Две подтемы (этажи/сетка) × три стадии.
 * Цель — пощупать механику лайфхака перед встройкой в олимпиадную карту.
 */

import { useState } from "react";
import Link from "next/link";
import { STAGE_RANGE, randIn, type FigKind, type FigStage } from "@/lib/figures";
import { FigureRunner } from "@/components/figures/FigureRunner";
import "./figures.css";

const KINDS: { id: FigKind; label: string; emoji: string }[] = [
  { id: "fan", label: "Этажи (веер)", emoji: "📐" },
  { id: "grid", label: "Сетка", emoji: "🔺" },
];
const STAGES: { id: FigStage; label: string; color: string }[] = [
  { id: "learn", label: "Учусь", color: "green" },
  { id: "train", label: "Тренируюсь", color: "blue" },
  { id: "solo", label: "Решаю сам", color: "pink" },
];

export default function FiguresPage() {
  const [kind, setKind] = useState<FigKind>("fan");
  const [stage, setStage] = useState<FigStage>("learn");
  const [n, setN] = useState(3);
  const [nonce, setNonce] = useState(0);
  const [solved, setSolved] = useState(false);

  function regen(k: FigKind, s: FigStage) {
    setN(randIn(STAGE_RANGE[k][s]));
    setNonce((x) => x + 1);
    setSolved(false);
  }
  const chooseKind = (k: FigKind) => { setKind(k); regen(k, stage); };
  const chooseStage = (s: FigStage) => { setStage(s); regen(kind, s); };
  const next = () => regen(kind, stage);

  return (
    <main className="fig-stage" aria-label="Подсчёт фигур">
      <div className="fig-wrap">
        <header className="fig-top">
          <Link className="fig-back" href="/">← На главную</Link>
          <h1>Подсчёт фигур</h1>
        </header>
        <p className="fig-intro">Не ищи фигуры глазами — заметь признак и примень лайфхак. 🪄</p>

        <div className="fig-tabs">
          <Link className="fig-tab" href="/figures/rules">📖 Лист правил</Link>
        </div>

        <div className="fig-tabs">
          {KINDS.map((k) => (
            <button key={k.id} className={`fig-tab ${kind === k.id ? "on" : ""}`} onClick={() => chooseKind(k.id)}>
              {k.emoji} {k.label}
            </button>
          ))}
        </div>

        <div className="fig-stages">
          {STAGES.map((s) => (
            <button key={s.id} className={`fig-stagebtn ${s.color} ${stage === s.id ? "on" : ""}`} onClick={() => chooseStage(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="fig-card">
          <FigureRunner key={`${kind}-${stage}-${nonce}`} kind={kind} stage={stage} n={n} onSolved={() => setSolved(true)} />
        </div>

        <div className="fig-actions">
          <button className="fig-next" onClick={next}>{solved ? "Следующая задача →" : "Другая задача"}</button>
        </div>
      </div>
    </main>
  );
}
