"use client";

/**
 * Раннер «Подсчёт фигур». Учит лайфхаку, а не визуальному поиску:
 *   заметить признак → применить правило (числовая лесенка) → получить итог.
 * Три стадии: Учусь (с подсказкой-правилом), Тренируюсь (по шагам), Решаю сам (итог).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  genFan, genGrid, LIFEHACKS, type FigKind, type FigStage,
} from "@/lib/figures";
import { FanFigure, GridFigure } from "./FigureView";

interface Step { label: string; expected: number; hint?: string }

function buildSteps(kind: FigKind, stage: FigStage, n: number): Step[] {
  if (kind === "fan") {
    const p = genFan(n);
    const sum = p.addends.join(" + ");
    if (stage === "learn") return [{ label: `Сложи комнаты: ${sum} =`, expected: p.total }];
    if (stage === "train")
      return [
        { label: "Сколько комнат внизу?", expected: n },
        { label: `Теперь сложи: ${sum} =`, expected: p.total },
      ];
    return [{ label: "Сколько всего треугольников?", expected: p.total }];
  }
  const p = genGrid(n);
  const up = p.upLadder.join(" + ");
  const down = p.downLadder.join(" + ");
  if (stage === "learn")
    return [
      { label: `Вверх — все ступеньки: ${up} =`, expected: p.upSum },
      { label: `Вниз — через одну: ${down} =`, expected: p.downSum },
      { label: "Итого: вверх + вниз =", expected: p.total },
    ];
  if (stage === "train")
    return [
      { label: "Длина стороны большого треугольника?", expected: n },
      { label: "Вверх — сложи все ступеньки =", expected: p.upSum, hint: `ступеньки: ${p.upLadder.join(", ")}` },
      { label: "Вниз — на одну ниже, через одну =", expected: p.downSum, hint: `ступеньки: ${p.downLadder.join(", ")}` },
      { label: "Итого =", expected: p.total },
    ];
  return [{ label: "Сколько всего треугольников?", expected: p.total }];
}

export function FigureRunner({
  kind, stage, n, onSolved,
}: {
  kind: FigKind; stage: FigStage; n: number; onSolved?: () => void;
}) {
  const steps = useMemo(() => buildSteps(kind, stage, n), [kind, stage, n]);
  const lh = LIFEHACKS[kind];
  const [idx, setIdx] = useState(0);
  const [val, setVal] = useState("");
  const [tries, setTries] = useState(0);
  const [showRule, setShowRule] = useState(stage === "learn");
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);

  const step = steps[idx];

  function submit() {
    const num = parseInt(val.replace(/\D/g, ""), 10);
    if (num === step.expected) {
      if (idx + 1 < steps.length) {
        setIdx(idx + 1);
        setVal("");
        setTries(0);
      } else {
        setDone(true);
        onSolved?.();
      }
    } else {
      setTries((t) => t + 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (tries + 1 >= 1) setShowRule(true);
    }
  }

  return (
    <div className="fr">
      <div className="fr-figure">
        {kind === "fan"
          ? <FanFigure n={n} numberRooms={stage !== "solo"} />
          : <GridFigure n={n} showDown={stage === "learn"} />}
      </div>

      {(showRule || stage === "learn") && (
        <div className="fr-rule">
          <span className="fr-rule-txt">💡 {lh.rule}</span>
          <Link className="fr-rule-link" href="/figures/rules">📖 Лист правил</Link>
        </div>
      )}

      {!done ? (
        <div className="fr-step">
          <div className="fr-progress">
            {steps.map((_, i) => <span key={i} className={`fr-dot ${i < idx ? "ok" : i === idx ? "cur" : ""}`} />)}
          </div>
          <label className="fr-label">{step.label}</label>
          {step.hint && tries > 0 && <div className="fr-hint">💡 {step.hint}</div>}
          <div className={`fr-input-row ${shake ? "shake" : ""}`}>
            <input
              className="fr-input"
              inputMode="numeric"
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && val && submit()}
              placeholder="?"
            />
            <button className="fr-go" disabled={!val} onClick={submit}>Проверить</button>
          </div>
          {tries > 0 && <div className="fr-wrong">Почти! Глянь на правило 👆 и попробуй ещё.</div>}
          {stage !== "learn" && !showRule && (
            <button className="fr-rulebtn" onClick={() => setShowRule(true)}>Показать правило</button>
          )}
        </div>
      ) : (
        <div className="fr-done">
          <div className="fr-done-ic">🎉</div>
          <div className="fr-done-t">Верно! Лайфхак сработал.</div>
          <div className="fr-done-rec">{lh.rule}</div>
        </div>
      )}
    </div>
  );
}
