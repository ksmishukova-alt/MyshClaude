"use client";

import { useState } from "react";
import type { TaskStep } from "@/types/domain";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/**
 * Поля-разбор: несколько подписанных полей ввода.
 * Морфемный разбор (приставка/корень/суффикс/окончание),
 * разбор словосочетания (главное/зависимое/вопрос).
 * Пустое окончание принимается как «нулевое»/«-» если в accepted это указано.
 */
export function FieldsRunner({
  step,
  locked,
  onCheck,
}: {
  step: TaskStep;
  locked: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const fields = step.fields ?? [];
  const [vals, setVals] = useState<string[]>(() => fields.map(() => ""));

  function setVal(i: number, v: string) {
    if (locked) return;
    setVals((a) => a.map((x, idx) => (idx === i ? v : x)));
  }

  function check() {
    const ok = fields.every((f, i) => {
      const got = norm(vals[i] ?? "");
      return f.accepted.some((a) => {
        const acc = norm(a);
        // допускаем пустой ответ, если в accepted есть пустая строка / "нулевое" / "-"
        if (acc === "" || acc === "нулевое" || acc === "-") {
          return got === "" || got === "нулевое" || got === "-";
        }
        return acc === got;
      });
    });
    onCheck(ok);
  }

  return (
    <div className="fld-runner">
      {step.fieldsSubject && <div className="fld-subject">{step.fieldsSubject}</div>}
      <div className="fld-grid">
        {fields.map((f, i) => (
          <label className="fld-cell" key={i}>
            <span className="fld-cap">{f.label}</span>
            <input
              className="fld-in"
              value={vals[i]}
              disabled={locked}
              onChange={(e) => setVal(i, e.target.value)}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {!locked && (
        <button type="button" className="ts-cta secondary fld-check" onClick={check}>
          Проверить
        </button>
      )}
    </div>
  );
}
