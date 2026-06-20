"use client";

/**
 * Экран темы: ОБЗОР (тема + объяснение метода + прогресс + L1–L5 + награда + «Продолжить»)
 * и РЕШЕНИЕ (поток задач с честной прогрессией).
 *
 *  - «Смотреть объяснение» показывает мини-метод темы и НЕ запускает задачу (ТЗ §7).
 *  - «Продолжить» / карточка уровня запускают прохождение.
 *  - Прогрессия по статусам попытки (ТЗ §4): clean-серия из 4 → уровень выше;
 *    «верно, но не чисто» серию сбрасывает; 2 провала подряд → откат + сигнал методисту.
 *
 * Прогресс на пилоте — клиентский (seed из мок/БД), запись попытки уходит в /api/olympiad/progress.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  OlympiadTheme,
  ThemeProgress,
  OlympiadLevel,
  OlympiadProblemV2,
  OlympiadTaskAttempt,
} from "@/types/olympiad";
import { OLYMPIAD_LEVELS, STAGE_DEFS, THEME_STAGES, levelToStage, type ThemeStage } from "@/types/olympiad";
import { applyResult, PROBLEMS_PER_LEVEL, type ProgressEvent } from "@/lib/olympiad-progress";
import { OlympiadRunner } from "@/components/olympiad/OlympiadRunner";
import { AssumptionRunner } from "@/components/olympiad/AssumptionRunner";

/** ТЕСТ-РЕЖИМ: открыть все уровни темы для сквозного просмотра (L1–L5). */
const TEST_OPEN_ALL_LEVELS = true;

/** Выбор раннера по форме задачи. */
function ProblemRunner({ problem, onComplete }: { problem: OlympiadProblemV2; onComplete: (a: OlympiadTaskAttempt) => void }) {
  if (problem.assumption) return <AssumptionRunner problem={problem} onComplete={onComplete} />;
  return <OlympiadRunner problem={problem} onComplete={onComplete} />;
}

export function ThemePlay({
  theme,
  initialProgress,
  problemsByLevel,
}: {
  theme: OlympiadTheme;
  initialProgress: ThemeProgress;
  problemsByLevel: Record<string, OlympiadProblemV2[]>;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<ThemeProgress>(initialProgress);
  const [view, setView] = useState<"overview" | "play">("overview");
  const [playLevel, setPlayLevel] = useState<OlympiadLevel | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const [problemSeq, setProblemSeq] = useState(0);
  const [banner, setBanner] = useState<{ event: ProgressEvent; notify: boolean } | null>(null);
  const [completed, setCompleted] = useState(false);

  function persistProgress(p: ThemeProgress, attempt?: OlympiadTaskAttempt) {
    void fetch("/api/olympiad/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: p, attempt }),
    }).catch(() => {});
  }

  const themeLevels = OLYMPIAD_LEVELS.filter((l) => theme.levels.includes(l));
  const curIdx = OLYMPIAD_LEVELS.indexOf(progress.currentLevel);
  // Уровень, который сейчас открыт в режиме РЕШЕНИЯ (для теста можно открыть любой).
  const activeLevel: OlympiadLevel = playLevel ?? progress.currentLevel;

  /** Кол-во задач уровня и сколько «решено» (для карточек). Счётчик — реальный. */
  function levelStats(l: OlympiadLevel) {
    const total = problemsByLevel[l]?.length ?? 0;
    const idx = OLYMPIAD_LEVELS.indexOf(l);
    let done = 0;
    let state: "passed" | "current" | "locked" = "locked";
    if (idx < curIdx) { done = total; state = "passed"; }
    else if (idx === curIdx) { done = Math.min(progress.solvedAtLevel, total || PROBLEMS_PER_LEVEL); state = "current"; }
    return { total, done, state };
  }

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
  }, [progress, theme.id, problemsByLevel]);

  const levelProblems = useMemo(
    () => problemsByLevel[activeLevel] ?? [],
    [problemsByLevel, activeLevel],
  );
  const problem: OlympiadProblemV2 | null =
    levelProblems.length > 0 ? levelProblems[problemSeq % levelProblems.length] : null;

  function startLevel(l?: OlympiadLevel) {
    setPlayLevel(l ?? progress.currentLevel);
    setBanner(null);
    setCompleted(false);
    setShowMethod(false);
    setProblemSeq(0);
    setView("play");
  }

  // ── Стадии (детский интерфейс A+C): L1–L2 «Учусь», L3–L4 «Тренируюсь», L5 «Решаю сам» ──
  const stagesPresent = THEME_STAGES.filter((st) =>
    STAGE_DEFS[st].levels.some((l) => theme.levels.includes(l)),
  );
  function stageStats(st: ThemeStage) {
    const lvls = STAGE_DEFS[st].levels.filter((l) => theme.levels.includes(l));
    let done = 0;
    let total = 0;
    for (const l of lvls) {
      const s = levelStats(l);
      done += s.done;
      total += s.total;
    }
    const allPassed = lvls.length > 0 && lvls.every((l) => OLYMPIAD_LEVELS.indexOf(l) < curIdx);
    const isCurrent = levelToStage(progress.currentLevel) === st;
    const state: "passed" | "current" | "locked" = allPassed ? "passed" : isCurrent ? "current" : "locked";
    return { lvls, done, total, state };
  }
  function startStage(st: ThemeStage) {
    const first = STAGE_DEFS[st].levels.find((l) => theme.levels.includes(l));
    if (first) startLevel(first);
  }

  function onComplete(attempt: OlympiadTaskAttempt) {
    const res = applyResult(progress, attempt.rewardStars, {
      status: attempt.status,
      masteryLevel: theme.masteryLevel,
      availableLevels: theme.levels,
    });
    setProgress(res.progress);
    persistProgress(res.progress, attempt);
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
    const activeStage = levelToStage(activeLevel);
    const aStageIdx = THEME_STAGES.indexOf(activeStage);
    return (
      <main className="top-stage" aria-label={`Тема: ${theme.title}`}>
        <div className="top-wrap olr-wrap">
          <header className="top-top">
            <button className="top-back" onClick={() => setView("overview")}>← К теме</button>
            <h1>{theme.icon} {theme.title}</h1>
          </header>

          <div className="olr-levelbar">
            {stagesPresent.map((st) => {
              const sIdx = THEME_STAGES.indexOf(st);
              const cls = sIdx < aStageIdx ? "passed" : sIdx === aStageIdx ? "current" : "ahead";
              return (
                <button
                  key={st}
                  className={`olr-levelstep wide ${cls} ${STAGE_DEFS[st].color}`}
                  title={STAGE_DEFS[st].tagline}
                  onClick={() => startStage(st)}
                >
                  <span className="olr-levelstep-id">{STAGE_DEFS[st].name}</span>
                </button>
              );
            })}
          </div>
          <div className="olr-levelinfo">
            <b>{STAGE_DEFS[activeStage].name}.</b> {STAGE_DEFS[activeStage].tagline}
            {activeLevel === progress.currentLevel && <span className="olr-streak"> · серия {progress.streak}/4 без ошибок</span>}
          </div>

          {banner && (
            <div className={`olr-banner ${banner.event}`}>
              {banner.event === "promoted" && (<>🚀 <b>Новый уровень!</b> Ты поднялся на {progress.currentLevel}. Задачи станут самостоятельнее.</>)}
              {banner.event === "mastered" && (<>🏅 <b>Тема освоена!</b> Значок «{theme.title}» твой. Можно идти дальше по карте.</>)}
              {banner.event === "rolledBack" && (<>↩️ <b>Вернёмся на шаг назад</b> — на {progress.currentLevel}. Закрепим метод. Методисту ушёл сигнал.</>)}
              {banner.event === "needsReasoningRevision" && (<>✍️ <b>Ответ верный — допиши решение.</b> Запиши рассуждение подробнее, чтобы засчитать «чисто». Серия начинается заново.</>)}
              {banner.event === "pendingReview" && (<>📨 <b>Отправлено методисту.</b> Листочек на проверке — уровень обновится после подтверждения.</>)}
              {banner.event === "none" && banner.notify && (<>🤝 Похоже, задача застряла. Методисту ушёл сигнал — скоро помогут.</>)}
              <button className="olr-cta sm" onClick={nextProblem}>Следующая задача →</button>
            </div>
          )}

          {!banner && problem && (
            <ProblemRunner key={problem.id + problemSeq + activeLevel} problem={problem} onComplete={onComplete} />
          )}
          {!banner && !problem && (
            <div className="olr-empty">
              <p>На уровне {activeLevel} пока нет задач в банке.</p>
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

  // ── ВИД: ОБЗОР ──
  const pct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
  const method = theme.method;
  return (
    <main className="top-stage" aria-label={`Тема: ${theme.title}`}>
      <div className="top-wrap thm-wrap">
        <header className="top-top">
          <Link className="top-back" href="/topics">← Назад к темам</Link>
        </header>

        <div className="thm-grid">
          <section className="thm-hero">
            <span className="thm-pill">🏆 Тема олимпиады</span>
            <h1 className="thm-title">{theme.title}</h1>
            <p className="thm-blurb">{theme.blurb}</p>
            <button className="thm-explain" onClick={() => setShowMethod((v) => !v)}>
              ▶ {showMethod ? "Скрыть объяснение" : "Смотреть объяснение"}
            </button>
            <div className="thm-mascot" aria-hidden />
          </section>

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

        {/* Объяснение метода темы — отдельно от подсказок, не запускает задачу (ТЗ §7) */}
        {showMethod && (
          <div className="thm-method">
            <h2>{method?.title ?? "Как решать задачи этой темы"}</h2>
            {method ? (
              <>
                <p className="thm-method-intro">{method.intro}</p>
                <ol className="thm-method-steps">
                  {method.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                {method.example && <div className="thm-method-ex">Пример: {method.example}</div>}
              </>
            ) : (
              <p className="thm-method-intro">{theme.blurb}</p>
            )}
            <button className="thm-explain" onClick={() => startLevel()}>Понятно, начать →</button>
          </div>
        )}

        <div className="thm-levels">
          {stagesPresent.map((st, i) => {
            const ss = stageStats(st);
            const def = STAGE_DEFS[st];
            const locked = ss.state === "locked";
            return (
              <button key={st} className={`thm-lvl ${def.color} ${ss.state}`} disabled={locked && !TEST_OPEN_ALL_LEVELS} onClick={() => startStage(st)} title={def.tagline}>
                <span className={`thm-lvl-badge ${def.color}`}>{i + 1}{locked && !TEST_OPEN_ALL_LEVELS && <i className="thm-lvl-lock">🔒</i>}</span>
                <span className="thm-lvl-name">{def.name}</span>
                <span className="thm-lvl-desc">{def.tagline}</span>
                <span className="thm-lvl-count">{ss.done} из {ss.total} заданий</span>
                {ss.state === "current" && <span className="thm-lvl-here">● Сейчас вы здесь</span>}
                {ss.state === "passed" && <span className="thm-lvl-here passed">✓ Пройдено</span>}
              </button>
            );
          })}

          <div className={`thm-reward ${progress.badgeEarned ? "earned" : ""}`}>
            <span className="thm-reward-cap">Награда темы</span>
            <div className="thm-reward-badge" aria-hidden>🏅</div>
            <span className="thm-reward-name">Наклейка «Мастер: {theme.title}»</span>
            <span className="thm-reward-sub">{progress.badgeEarned ? "Получена!" : `Открой уровень ${theme.masteryLevel}`}</span>
          </div>
        </div>

        <div className="thm-bottom">
          <button className="thm-continue" onClick={() => startLevel()}>Продолжить 🚀</button>
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
