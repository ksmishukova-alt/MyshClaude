"use client";

import { useState } from "react";
import type { ReviewItem, ReviewVerdict } from "@/types/domain";
import { SUBJECTS, VERDICT_LABELS } from "@/types/domain";

export function MethodistPanel({ initialQueue }: { initialQueue: ReviewItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [active, setActive] = useState<ReviewItem | null>(initialQueue[0] ?? null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(verdict: ReviewVerdict) {
    if (!active) return;
    setBusy(true);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: active.attemptId, verdict, feedback }),
      });
    } catch {
      /* на моках ok:false — это нормально */
    }
    // убираем из очереди и переходим к следующему
    const rest = queue.filter((q) => q.attemptId !== active.attemptId);
    setQueue(rest);
    setActive(rest[0] ?? null);
    setFeedback("");
    setBusy(false);
  }

  if (!active) {
    return (
      <div className="md-empty">
        <div className="md-empty-ic">✅</div>
        <h2>Очередь пуста</h2>
        <p>Все работы проверены. Отличная работа!</p>
      </div>
    );
  }

  const subject = SUBJECTS[active.subjectId];

  return (
    <div className="md-layout">
      {/* очередь */}
      <aside className="md-queue">
        <div className="md-queue-head">
          На проверку <span>{queue.length}</span>
        </div>
        <ul>
          {queue.map((q) => (
            <li key={q.attemptId}>
              <button
                className={`md-queue-item${q.attemptId === active.attemptId ? " active" : ""}`}
                onClick={() => {
                  setActive(q);
                  setFeedback("");
                }}
              >
                <span className={`md-q-ico s-${q.subjectId}`}>{SUBJECTS[q.subjectId].glyph}</span>
                <span className="md-q-body">
                  <span className="md-q-child">{q.childName}</span>
                  <span className="md-q-task">{q.taskTitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* детальная проверка */}
      <section className="md-detail">
        <header className="md-detail-head">
          <span className={`md-ico s-${active.subjectId}`}>{subject.glyph}</span>
          <div>
            <h1>{active.taskTitle}</h1>
            <p>
              {active.childName} · {subject.title}
            </p>
          </div>
        </header>

        <div className="md-photo">
          {/* фото решения с листочка */}
          <img src={active.solutionUrl} alt={`Решение: ${active.taskTitle}`} />
          <div className="md-photo-note">Фото решения с листочка</div>
        </div>

        <label className="md-feedback">
          <span>Комментарий ребёнку</span>
          <textarea
            rows={2}
            placeholder="Например: Молодец! Проверь только последний пример…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </label>

        <div className="md-actions">
          <button className="md-btn perfect" disabled={busy} onClick={() => decide("perfect")}>
            ⭐ {VERDICT_LABELS.perfect.label}
          </button>
          <button className="md-btn ok" disabled={busy} onClick={() => decide("successful")}>
            ✓ {VERDICT_LABELS.successful.label}
          </button>
          <button
            className="md-btn revise"
            disabled={busy}
            onClick={() => decide("needsRevision")}
          >
            ↩ {VERDICT_LABELS.needsRevision.label}
          </button>
        </div>
      </section>
    </div>
  );
}
