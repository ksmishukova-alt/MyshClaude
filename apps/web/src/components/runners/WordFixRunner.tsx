"use client";

import { useState } from "react";
import type { TaskStep } from "@/types/domain";

/**
 * RU_CONTEXT_WORD_FIX — найти неподходящее слово и выбрать замену.
 * Шаг 1: клик по слову. Шаг 2: выбор замены из вариантов.
 * Правильность не раскрывается до проверки.
 */
export function WordFixRunner({
  step,
  locked,
  onCheck,
}: {
  step: TaskStep;
  locked: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const words = step.sentenceWords ?? [];
  const replacements = step.replacements ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const [replacement, setReplacement] = useState<string | null>(null);

  function check() {
    const ok =
      picked === step.wrongWordIndex &&
      replacement === step.correctReplacement;
    onCheck(ok);
  }

  return (
    <div className="wf">
      <div className="wf-sentence">
        {words.map((w, i) => (
          <button
            key={i}
            type="button"
            className={`wf-word${picked === i ? " picked" : ""}`}
            onClick={() => !locked && setPicked(i)}
            disabled={locked}
          >
            {w}
          </button>
        ))}
      </div>

      {picked !== null && (
        <div className="wf-replace">
          <div className="wf-replace-label">Чем заменить?</div>
          <div className="wf-options">
            {replacements.map((r) => (
              <button
                key={r}
                type="button"
                className={`wf-opt${replacement === r ? " sel" : ""}`}
                onClick={() => !locked && setReplacement(r)}
                disabled={locked}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {!locked && (
        <button
          type="button"
          className="ts-cta secondary wf-check"
          onClick={check}
          disabled={picked === null || replacement === null}
        >
          Проверить
        </button>
      )}
    </div>
  );
}
