"use client";

/**
 * Экран темы: ОБЗОР (макет: герой + прогресс + карточки уровней + награда)
 * и РЕШЕНИЕ (поток задач с прогрессией).
 *
 * Прогрессия:
 *  - 3 попытки на задачу (в раннере), нарастающие подсказки.
 *  - 4 верных подряд → авто-перевод на уровень выше (баннер).
 *  - 2 провала подряд → откат уровня + уведомление методисту (стаб TG).
 *  - Значок за достижение целевого уровня темы.
 *
 * Прогресс на пилоте — клиентский (seed из мок-слоя).
 * SEAM ДЛЯ БД: заменить initialProgress на загрузку по childId и
 * persistProgress() — на запись в репозиторий (см. lib/data.ts как образец).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OlympiadTheme, ThemeProgress, OlympiadLevel, OlympiadProblemV2 } from "@/types/olympiad";
import { LEVEL_SPECS, LEVEL_UI, OLYMPIAD_LEVELS } from "@/types/olympiad";
import { applyResult, PROBLEMS_PER_LEVEL, type ProgressEvent } from "@/lib/olympiad-progress";
import { OlympiadRunner } from "@/components/olympiad/OlympiadRunner";

export function ThemePlay({
  theme,
  initialProgress,
  problemsByLevel,
}: {
  theme: OlympiadTheme;
  initialProgress: ThemeProgress;
  /** Задачи темы по уровням (из БД или мок-слоя — приходят пропом со страницы). */
  problemsByLevel: Record<string, OlympiadProblemV2[]>;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<ThemeProgress>(initialProgress);
  const [view, setView] = useState<"overview" | "play">("overview");
  const [problemSeq, setProblemSeq] = useState(0);
  const [banner, setBanner] = useState<{ event: ProgressEvent; notify: boolean } | null>(null);
  const [completed, setCompleted] = useState(false);

  // Сохранение прогресса: пишет в БД через API (если Supabase настроен; иначе no-op на сервере).
  function persistProgress(p: ThemeProgress, attempt?: { problemId: string; isCorrect: boolean | null; attemptsUsed: number }) {
    void fetch("/api/olympiad/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: p,
        attempt: attempt ? { ...attempt, level: p.currentLevel } : undefined,
      }),
    }).catch(() => {});
  }

  const themeLevels = OLYMPIAD_LEVELS.filter((l) => theme.levels.includes(l));
  const curIdx = OLYMPIAD_LEVELS.indexOf(progress.currentLevel);

  /** Кол-во задач уровня и сколько «решено» (для карточек). */
  function levelStats(l: OlympiadLevel) {
    const total = Math.max(problemsByLevel[l]?.length ?? 0, PROBLEMS_PER_LEVEL);
    const idx = OLYMPIAD_LEVELS.indexOf(l);
    let done = 0;
    let state: "passed" | "current" | "locked" = "locked";
    if (idx < curIdx) { done = total; state = "passed"; }
    else if (idx === curIdx) { done = progress.solvedAtLevel; state = "current"; }
    return { total, done, state };
  }

  // суммарный прогресс по теме (для карточки «Прогресс темы»)
  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const l of themeLevels) {
      const s = levelStats(l);
      total += s.total;
      done += s.done;
    }
    return { total, done, inWork: progress.solvedAtLevel > 0 ? Math.min(2, progress.streak || 1) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, theme.id]);

  const levelProblems = useMemo(
    () => problemsByLevel[progress.currentLevel] ?? [],
    [problemsByLevel, progress.currentLevel],
  );
  const problem: OlympiadProblemV2 | null =
    levelProblems.length > 0 ? levelProblems[problemSeq % levelProblems.length] : null;

  function startLevel() {
    setBanner(null);
    setCompleted(false);
    setView("play");
  }

  function onComplete(correct: boolean, attemptsUsed?: number) {
    const res = applyResult(progress, problem?.rewardStars ?? 0, {
      correct,
      masteryLevel: theme.masteryLevel,
      availableLevels: theme.levels,
    });
    setProgress(res.progress);
    persistProgress(
      res.progress,
      problem ? { problemId: problem.id, isCorrect: correct, attemptsUsed: attemptsUsed ?? 1 } : undefined,
    );
    setCompleted(true);
    if (res.notifyMethodist) notifyMethodist(theme, res.progress);
    if (res.event !== "none" && res.event !== "solved") setBanner({ event: res.event, notify: res.notifyMethodist });
    else if (res.notifyMethodist) setBanner({ event: "none", notify: true });
  }

  function nextProblem() {
    setBanner(null);
    setCompleted(false);
    setProblemSeq((n) => n + 1);
  }

  // ── ВИД: РЕШЕНИЕ ──
  if (view === "play") {
    const spec = LEVEL_SPECS[progress.currentLevel];
    return (
      <main className="top-stage" aria-label={`Тема: ${theme.title}`}>
        <div className="top-wrap olr-wrap">
          <header className="top-top">
            <button className="top-back" onClick={() => setView("overview")}>← К теме</button>
            <h1>{theme.icon} {theme.title}</h1>
          </header>

          <div className="olr-levelbar">
            {themeLevels.map((l) => {
              const idx = OLYMPIAD_LEVELS.indexOf(l);
              const cls = idx < curIdx ? "passed" : idx === curIdx ? "current" : "ahead";
              return (
                <div key={l} className={`olr-levelstep ${cls} ${LEVEL_UI[l].color}`} title={LEVEL_SPECS[l].tagline}>
                  <span className="olr-levelstep-id">{l}</span>
                  {l === theme.masteryLevel && <span className="olr-levelstep-star">★</span>}
                </div>
              );
            })}
          </div>
          <div className="olr-levelinfo">
            <b>{spec.title}.</b> {spec.tagline}
            <span className="olr-streak"> · серия {progress.streak}/4 без ошибок</span>
          </div>

          {banner && (
            <div className={`olr-banner ${banner.event}`}>
              {banner.event === "promoted" && (<>🚀 <b>Новый уровень!</b> Ты поднялся на {progress.currentLevel}. Задачи станут самостоятельнее.</>)}
              {banner.event === "mastered" && (<>🏅 <b>Тема освоена!</b> Значок «{theme.title}» твой. Можно идти дальше по карте.</>)}
              {banner.event === "rolledBack" && (<>↩️ <b>Вернёмся на шаг назад</b> — на {progress.currentLevel}. Закрепим метод. Методисту ушёл сигнал.</>)}
              {banner.event === "none" && banner.notify && (<>🤝 Похоже, задача застряла. Методисту ушёл сигнал — скоро помогут.</>)}
              <button className="olr-cta sm" onClick={nextProblem}>Следующая задача →</button>
            </div>
          )}

          {!banner && problem && (
            <OlympiadRunner key={problem.id + problemSeq} problem={problem} onComplete={onComplete} />
          )}
          {!banner && !problem && (
            <div className="olr-empty">
              <p>На уровне {progress.currentLevel} пока нет задач в банке.</p>
              <button className="olr-cta" onClick={() => setView("overview")}>← К теме</button>
            </div>
          )}
          {!banner && completed && problem && (
            <div className="olr-continue">
              <button className="olr-cta ghost" onClick={nextProblem}>Следующая задача →</button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── ВИД: ОБЗОР (макет) ──
  const pct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
  return (
    <main className="top-stage" aria-label={`Тема: ${theme.title}`}>
      <div className="top-wrap thm-wrap">
        <header className="top-top">
          <Link className="top-back" href="/topics">← Назад к темам</Link>
        </header>

        <div className="thm-grid">
          {/* Герой */}
          <section className="thm-hero">
            <span className="thm-pill">🏆 Тема олимпиады</span>
            <h1 className="thm-title">{theme.title}</h1>
            <p className="thm-blurb">{theme.blurb}</p>
            <button className="thm-explain" onClick={startLevel}>▶ Смотреть объяснение</button>
            <div className="thm-mascot" aria-hidden />
          </section>

          {/* Прогресс темы */}
          <aside className="thm-progress">
            <h2>Прогресс темы</h2>
            <div className="thm-prog-big">{totals.done} из {totals.total} заданий</div>
            <div className="thm-prog-bar"><span style={{ width: `${pct}%` }} /></div>
            <div className="thm-prog-stats">
              <div className="thm-stat"><b className="ok">✓ {totals.done}</b><span>Решено</span></div>
              <div className="thm-stat"><b className="work">✎ {totals.inWork}</b><span>В работе</span></div>
              <div className="thm-stat"><b className="all">★ {totals.total}</b><span>Всего</span></div>
            </div>
          </aside>
        </div>

        {/* Карточки уровней + награда */}
        <div className="thm-levels">
          {themeLevels.map((l) => {
            const s = levelStats(l);
            const ui = LEVEL_UI[l];
            const locked = s.state === "locked";
            return (
              <button
                key={l}
                className={`thm-lvl ${ui.color} ${s.state}`}
                disabled={locked}
                onClick={startLevel}
                title={LEVEL_SPECS[l].tagline}
              >
                <span className={`thm-lvl-badge ${ui.color}`}>{l}{locked && <i className="thm-lvl-lock">🔒</i>}</span>
                <span className="thm-lvl-name">{ui.name}</span>
                <span className="thm-lvl-desc">{LEVEL_SPECS[l].tagline}</span>
                <span className="thm-lvl-count">{s.done} из {s.total} заданий</span>
                {s.state === "current" && <span className="thm-lvl-here">● Сейчас вы здесь</span>}
                {s.state === "passed" && <span className="thm-lvl-here passed">✓ Пройдено</span>}
              </button>
            );
          })}

          {/* Награда темы */}
          <div className={`thm-reward ${progress.badgeEarned ? "earned" : ""}`}>
            <span className="thm-reward-cap">Награда темы</span>
            <div className="thm-reward-badge" aria-hidden>🏅</div>
            <span className="thm-reward-name">Наклейка «Мастер: {theme.title}»</span>
            <span className="thm-reward-sub">{progress.badgeEarned ? "Получена!" : `Открой уровень ${theme.masteryLevel}`}</span>
          </div>
        </div>

        {/* Нижний CTA */}
        <div className="thm-bottom">
          <button className="thm-continue" onClick={startLevel}>Продолжить 🚀</button>
          <button className="thm-fav" onClick={() => router.push("/topics")}>🔖 К карте тем</button>
        </div>
      </div>
    </main>
  );
}

/** Стаб уведомления методиста (на проде — Telegram-бот, см. plan.md §7). */
function notifyMethodist(theme: OlympiadTheme, p: ThemeProgress) {
  void fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "olympiad-stuck", themeId: theme.id, level: p.currentLevel }),
  }).catch(() => {});
}
