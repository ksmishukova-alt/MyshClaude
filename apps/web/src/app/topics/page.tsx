import Link from "next/link";
import { fetchThemes, fetchThemeProgressMap } from "@/lib/olympiad-data";
import { getCurrentChildId } from "@/lib/session";
import { LEVEL_SPECS, OLYMPIAD_LEVELS } from "@/types/olympiad";
import type { OlympiadLevel } from "@/types/olympiad";
import "./topics.css";
import "@/components/olympiad/olympiad-core.css";

/**
 * Карта тем (олимпиадный маршрут).
 * Тема — ЕДИНЫЙ узел, проходимый на глубину L1→L5/L6.
 * Узлы открываются по зависимостям; у каждого виден текущий уровень и значок.
 * Данные: БД (Supabase) с откатом на мок-слой (см. lib/olympiad-data.ts).
 */
export default async function TopicsPage() {
  const childId = await getCurrentChildId();
  const [themes, progress] = await Promise.all([
    fetchThemes(),
    fetchThemeProgressMap(childId),
  ]);

  const firstPlayable = themes.find((t) => {
    const st = progress[t.id]?.state;
    return st === "open" || st === "inProgress";
  });

  function levelLadder(levels: OlympiadLevel[], current: OlympiadLevel, mastery: OlympiadLevel) {
    return OLYMPIAD_LEVELS.filter((l) => levels.includes(l)).map((l) => {
      const idx = OLYMPIAD_LEVELS.indexOf(l);
      const curIdx = OLYMPIAD_LEVELS.indexOf(current);
      const cls = idx < curIdx ? "passed" : idx === curIdx ? "current" : "ahead";
      const star = l === mastery ? "★" : "";
      return (
        <span key={l} className={`tl-pill ${cls}`} title={LEVEL_SPECS[l].tagline}>
          {l}
          {star}
        </span>
      );
    });
  }

  return (
    <main className="top-stage" aria-label="Карта тем">
      <div className="top-wrap">
        <header className="top-top">
          <Link className="top-back" href="/">← На главную</Link>
          <h1>Карта мышления</h1>
        </header>
        <p className="top-intro">
          Каждый остров — это тема олимпиадной математики. Тему проходят на глубину:
          от ведения за руку (L1) до олимпиадной самостоятельности (L5). За освоенные
          темы дают значки ★ — так видно, как ты растёшь.
        </p>

        {firstPlayable && (
          <Link className="top-cta" href={`/topics/${firstPlayable.id}`}>
            Продолжить: {firstPlayable.title} <span>▶</span>
          </Link>
        )}

        <div className="top-islands">
          {themes.map((theme) => {
            const p = progress[theme.id];
            const playable = p.state === "open" || p.state === "inProgress" || p.state === "mastered";
            const inner = (
              <>
                <div className="top-isl-row">
                  <span className="top-isl-ico">{theme.icon}</span>
                  {p.badgeEarned && <span className="top-isl-badge" title="Тема освоена">🏅</span>}
                  {p.state === "locked" && <span className="top-lock">🔒</span>}
                </div>
                <span className="top-isl-title">{theme.title}</span>
                <span className="top-isl-blurb">{theme.blurb}</span>
                <div className="tl-ladder">
                  {playable
                    ? levelLadder(theme.levels, p.currentLevel, theme.masteryLevel)
                    : <span className="tl-hint">Откроется после: {theme.dependsOn.join(", ")}</span>}
                </div>
                {playable && p.stars > 0 && <span className="top-isl-stars">★ {p.stars}</span>}
              </>
            );
            const cls = `top-isl ${p.state}`;
            return playable ? (
              <Link key={theme.id} className={cls} href={`/topics/${theme.id}`}>
                {inner}
              </Link>
            ) : (
              <div key={theme.id} className={cls} aria-disabled="true">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
