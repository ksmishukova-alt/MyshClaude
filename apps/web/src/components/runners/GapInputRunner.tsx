"use client";

import { useState } from "react";
import type { TaskStep } from "@/types/domain";

/** Нормализация для сверки: нижний регистр, ё→е, убрать лишние пробелы. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/**
 * Ввод в пропуск(и). Универсальный раннер:
 * орфограммы, проверочные слова, грамматические формы, анаграммы, перевод слова.
 * Каждый gap: подпись (контекст) + поле ввода. Варианты не показываются.
 */
export function GapInputRunner({
  step,
  locked,
  onCheck,
}: {
  step: TaskStep;
  locked: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const gaps = step.gaps ?? [];
  const [vals, setVals] = useState<string[]>(() => gaps.map(() => ""));

  function setVal(i: number, v: string) {
    if (locked) return;
    setVals((a) => a.map((x, idx) => (idx === i ? v : x)));
  }

  function check() {
    const ok = gaps.every((g, i) =>
      g.accepted.some((a) => norm(a) === norm(vals[i] ?? ""))
    );
    onCheck(ok);
  }

  const allFilled = vals.every((v) => v.trim().length > 0);

  return (
    <div className="gi">
      <div className="gi-list">
        {gaps.map((g, i) => (
          <div className="gi-row" key={i}>
            <span className="gi-label">{g.label}</span>
            <input
              className="gi-input"
              value={vals[i]}
              disabled={locked}
              onChange={(e) => setVal(i, e.target.value)}
              aria-label={g.label}
              autoComplete="off"
            />
            {g.note && <span className="gi-note">{g.note}</span>}
          </div>
        ))}
      </div>
      {!locked && (
        <button
          type="button"
          className="ts-cta secondary gi-check"
          onClick={check}
          disabled={!allFilled}
        >
          Проверить
        </button>
      )}
    </div>
  );
}
