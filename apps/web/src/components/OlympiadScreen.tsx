"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OlympiadProblem, SolutionRecord } from "@/types/domain";
import { SOLUTION_FIELDS, reasoningCompleteness } from "@/types/domain";

const EMPTY: SolutionRecord = {
  selectedData: "",
  solutionPlan: "",
  solutionSteps: "",
  reasoningText: "",
  finalAnswer: "",
};

export function OlympiadScreen({ problem }: { problem: OlympiadProblem }) {
  const router = useRouter();
  const [rec, setRec] = useState<SolutionRecord>(EMPTY);
  const [attempts, setAttempts] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const completeness = reasoningCompleteness(rec);
  const hintAvailable = !!problem.hint && attempts >= 1; // подсказка со 2-й попытки
  const answerFilled = rec.finalAnswer.trim().length > 0;

  function set(key: keyof SolutionRecord, v: string) {
    setRec((r) => ({ ...r, [key]: v }));
  }

  function submit() {
    setAttempts((a) => a + 1);
    // запись решения уходит методисту; ответ можно самопроверить
    void fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: problem.id,
        mode: "platform",
        isCorrect: null,
        autonomyScore: completeness,
      }),
    }).catch(() => {});
    setSubmitted(true);
  }

  return (
    <main className="olymp-stage" aria-label={`Олимпиада: ${problem.title}`}>
      <div className="olymp-wrap">
        <header className="ts-top">
          <button className="ts-back" onClick={() => router.push("/topics")}>
            ← К темам
          </button>
          <div className="ts-progress">🏆 Олимпиадная задача</div>
          <span className="olymp-reward">★ +{problem.rewardStars}</span>
        </header>

        <div className="olymp-body">
          {/* Условие */}
          <section className="olymp-statement">
            <h1>{problem.title}</h1>
            <p>{problem.statement}</p>

            {hintAvailable && (
              <div className="olymp-hint-row">
                {!hintUsed ? (
                  <button className="ts-hint-btn" onClick={() => setHintUsed(true)}>
                    💡 Подсказка
                  </button>
                ) : (
                  <div className="ts-hint">{problem.hint}</div>
                )}
              </div>
            )}
          </section>

          {/* Запись решения */}
          <section className="olymp-record">
            <div className="olymp-record-head">
              <h2>Запиши решение по шагам</h2>
              <div className="olymp-completeness">
                <span>Заполнено</span>
                <div className="bar">
                  <span style={{ width: `${Math.round(completeness * 100)}%` }} />
                </div>
              </div>
            </div>

            {SOLUTION_FIELDS.map((f) => (
              <label key={f.key} className="olymp-field">
                <span className="olymp-field-label">{f.label}</span>
                <textarea
                  value={rec[f.key]}
                  placeholder={f.placeholder}
                  rows={f.key === "solutionSteps" ? 3 : 2}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </label>
            ))}

            {submitted ? (
              <div className="olymp-done">
                <b>Решение отправлено! 🎉</b>
                <span>
                  Методист посмотрит твою запись.
                  {problem.expectedAnswer &&
                    answerFilled &&
                    rec.finalAnswer.trim().toLowerCase() ===
                      problem.expectedAnswer.toLowerCase() &&
                    " Похоже, ответ верный!"}
                </span>
                <div className="olymp-actions">
                  <button className="ts-cta" onClick={() => router.push("/topics")}>
                    Вернуться к темам →
                  </button>
                </div>
              </div>
            ) : (
              <div className="olymp-actions">
                <button className="ts-cta" disabled={!answerFilled} onClick={submit}>
                  Отправить решение
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
