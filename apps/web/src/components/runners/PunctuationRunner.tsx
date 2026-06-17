"use client";

import { useState } from "react";
import type { PunctMark, TaskStep } from "@/types/domain";

const MARKS: { mark: PunctMark; label: string }[] = [
  { mark: ".", label: "." },
  { mark: ",", label: "," },
  { mark: "?", label: "?" },
  { mark: "!", label: "!" },
  { mark: "", label: "✕" }, // убрать знак
];

/**
 * RU_PUNCTUATION_MARKER — расстановка знаков и заглавных букв.
 * Между словами слоты, снизу панель выбора знака. Первые буквы слов
 * переключаются строчная/заглавная по клику. Правильность не раскрывается.
 *
 * onResult(correct) вызывается при проверке (родитель считает попытки).
 */
export function PunctuationRunner({
  step,
  locked,
  onCheck,
}: {
  step: TaskStep;
  locked: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const words = step.words ?? [];
  const [activeMark, setActiveMark] = useState<PunctMark>(".");
  // знак в слоте после слова i
  const [slots, setSlots] = useState<PunctMark[]>(() => words.map(() => ""));
  // заглавная ли первая буква слова i
  const [caps, setCaps] = useState<boolean[]>(() => words.map(() => false));

  function setSlot(i: number) {
    if (locked) return;
    setSlots((s) => s.map((v, idx) => (idx === i ? activeMark : v)));
  }
  function toggleCap(i: number) {
    if (locked) return;
    setCaps((c) => c.map((v, idx) => (idx === i ? !v : v)));
  }

  function check() {
    const expMarks = step.expectedMarks ?? [];
    const expCaps = new Set(step.expectedCapitals ?? []);
    let ok = true;
    for (let i = 0; i < words.length; i++) {
      if ((slots[i] || "") !== (expMarks[i] || "")) ok = false;
      if (caps[i] !== expCaps.has(i)) ok = false;
    }
    onCheck(ok);
  }

  function renderWord(w: string, i: number) {
    const first = w.charAt(0);
    const rest = w.slice(1);
    const shown = caps[i] ? first.toUpperCase() : first.toLowerCase();
    return (
      <span className="pm-word-wrap" key={i}>
        <button
          type="button"
          className={`pm-word${caps[i] ? " cap" : ""}`}
          onClick={() => toggleCap(i)}
          disabled={locked}
        >
          <span className="pm-first">{shown}</span>
          {rest}
        </button>
        <button
          type="button"
          className={`pm-slot${slots[i] ? " filled" : ""}`}
          onClick={() => setSlot(i)}
          disabled={locked}
          aria-label="Поставить знак"
        >
          {slots[i] || "+"}
        </button>
      </span>
    );
  }

  return (
    <div className="pm">
      <div className="pm-text">{words.map(renderWord)}</div>

      <div className="pm-panel">
        <span className="pm-panel-label">Знак:</span>
        {MARKS.map((m) => (
          <button
            key={m.label}
            type="button"
            className={`pm-mark${activeMark === m.mark ? " active" : ""}`}
            onClick={() => setActiveMark(m.mark)}
            disabled={locked}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!locked && (
        <button type="button" className="ts-cta secondary pm-check" onClick={check}>
          Проверить
        </button>
      )}
    </div>
  );
}
