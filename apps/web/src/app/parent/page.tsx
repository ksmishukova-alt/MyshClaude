import Link from "next/link";
import { getParentDashboard } from "@/lib/mock-data";
import { SUBJECTS } from "@/types/domain";
import "./parent.css";

export default function ParentPage() {
  const children = getParentDashboard();
  return (
    <main className="pr-stage" aria-label="Панель родителя">
      <header className="pr-top">
        <div className="pr-logo">
          Мыш<span>Мат</span> · <b>родитель</b>
        </div>
        <Link className="pr-switch" href="/login">Сменить профиль</Link>
      </header>

      <div className="pr-grid">
        {children.map((c) => {
          const autonomyPct = Math.round(c.autonomy * 100);
          const weekPct = Math.round((c.weekDailyDone / c.weekDailyTotal) * 100);
          const autonomyTone =
            c.autonomy >= 0.8 ? "green" : c.autonomy >= 0.6 ? "blue" : "orange";
          return (
            <section className="pr-card" key={c.childId}>
              <header className="pr-card-head">
                <span className="pr-avatar">🐭</span>
                <div>
                  <h2>{c.name}</h2>
                  <p>{c.grade} класс</p>
                </div>
                <div className="pr-stars">★ {c.stars}</div>
              </header>

              <div className="pr-metrics">
                <div className="pr-metric">
                  <div className="pr-metric-label">Daily за неделю</div>
                  <div className="pr-metric-val">
                    {c.weekDailyDone}<small>/{c.weekDailyTotal}</small>
                  </div>
                  <div className="pr-bar"><span style={{ width: `${weekPct}%` }} /></div>
                </div>
                <div className="pr-metric">
                  <div className="pr-metric-label">Самостоятельность</div>
                  <div className={`pr-metric-val ${autonomyTone}`}>{autonomyPct}%</div>
                  <div className="pr-bar">
                    <span className={autonomyTone} style={{ width: `${autonomyPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="pr-hint">
                {c.autonomy >= 0.8
                  ? "Решает почти всё сам — отличная самостоятельность!"
                  : c.autonomy >= 0.6
                  ? "Хороший баланс: иногда пользуется подсказками."
                  : "Часто нужна помощь — стоит вместе разобрать сложные темы."}
              </div>

              <div className="pr-subjects">
                {c.subjects.map((s) => (
                  <div key={s.subjectId} className={`pr-subj${s.done ? " done" : ""}`}>
                    <span className={`pr-subj-ico s-${s.subjectId}`}>
                      {SUBJECTS[s.subjectId].glyph}
                    </span>
                    <span className="pr-subj-name">{SUBJECTS[s.subjectId].title}</span>
                    <span className="pr-subj-mark">{s.done ? "✓" : "—"}</span>
                  </div>
                ))}
              </div>

              <div className="pr-recent">
                <h3>Недавняя активность</h3>
                <ul>
                  {c.recent.map((r, i) => (
                    <li key={i}>
                      <span className="pr-recent-date">{r.date}</span>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
