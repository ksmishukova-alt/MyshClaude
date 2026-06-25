"use client";

/** Карточка-лайфхак: единый шаблон методики (8 частей). */

import type { Lifehack } from "@/lib/figures";

export function LifehackCard({ lh, compact = false }: { lh: Lifehack; compact?: boolean }) {
  return (
    <div className="lh-card">
      <div className="lh-name">💡 {lh.name}</div>

      <div className="lh-rule">{lh.rule}</div>

      <div className="lh-grid">
        <Section title="Что заметить" text={lh.whatToCount} />
        <Section title="Как записать" text={lh.recordExample} mono />
        {!compact && <Section title="Почему работает" text={lh.why} />}
        {!compact && <Section title="Когда работает" text={lh.boundary} />}
      </div>

      {!compact && (
        <div className="lh-examples">
          <div className="lh-sub">Лесенка примеров</div>
          <ul>
            {lh.ladderExamples.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="lh-check">🤔 Проверь себя: {lh.selfCheck}</div>
    </div>
  );
}

function Section({ title, text, mono = false }: { title: string; text: string; mono?: boolean }) {
  return (
    <div className="lh-sec">
      <div className="lh-sub">{title}</div>
      <div className={mono ? "lh-mono" : "lh-text"}>{text}</div>
    </div>
  );
}
