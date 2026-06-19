"use client";

/**
 * Олимпиадный раннер: учит НЕ просто получать ответ, а записывать решение.
 * Отрисовка зависит от УРОВНЯ (формата записи, ТЗ §5), данные шагов не теряются (ТЗ §2):
 *
 *  L1 solution_fill_blanks      — заполнить ключевые части по шаблону (с подсказками).
 *  L2 solution_plan_builder     — план + шаги, сильная опора.
 *  L3 reasoning_text_builder    — сам собери план и допиши объяснение, подсказок минимум.
 *  L4 action_explanation_choice — действие → выражение → короткое «почему».
 *  L5 full_written_solution     — фото листочка (до 3) + ответ → проверка методиста.
 *
 * На завершении собирает OlympiadTaskAttempt (запись 5 частей + шаги + подсказки +
 * ошибки + полнота + статус) и отдаёт его наверх. Разбор (ТЗ §6) — отдельно от подсказок.
 */

import { useMemo, useState } from "react";
import type {
  OlympiadProblemV2,
  OlympiadStep,
  LevelSpec,
  OlympiadStepResult,
  OlympiadSolutionRecord,
  OlympiadTaskAttempt,
  SolutionField,
} from "@/types/olympiad";
import { LEVEL_SPECS, computeReasoningCompleteness } from "@/types/olympiad";
import {
  MAX_ATTEMPTS,
  checkStepAnswer,
  checkFinalAnswer,
  summarizeSteps,
  computeAttemptStatus,
} from "@/lib/olympiad-progress";

type StepState = {
  value: string;
  actionKind?: string;
  explanation?: string; // id выбранного объяснения (L4)
  order: string[];
  attempts: number;
  hintUsed: boolean;
  hadError: boolean;
  errorCodes: string[];
  status: "idle" | "wrong" | "correct";
};

function emptyStep(): StepState {
  return { value: "", order: [], attempts: 0, hintUsed: false, hadError: false, errorCodes: [], status: "idle" };
}

export function OlympiadRunner({
  problem,
  onComplete,
}: {
  problem: OlympiadProblemV2;
  /** Вызывается на завершении задачи с полной попыткой (ТЗ §1). */
  onComplete?: (attempt: OlympiadTaskAttempt) => void;
}) {
  const spec: LevelSpec = LEVEL_SPECS[problem.level];
  const format = spec.recordingFormat;
  const steps = problem.steps ?? [];
  const isWorksheet = spec.reasoningMode === "worksheet";
  const hasSteps = steps.length > 0 && !isWorksheet;

  const [stepIdx, setStepIdx] = useState(0);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [phase, setPhase] = useState<"steps" | "answer" | "done">(hasSteps ? "steps" : "answer");

  // финальный ответ + запись рассуждения (L3 пишет словами)
  const [answer, setAnswer] = useState("");
  const [reasoningText, setReasoningText] = useState("");
  const [answerAttempts, setAnswerAttempts] = useState(0);
  const [answerWrong, setAnswerWrong] = useState(false);
  const [answerHintUsed, setAnswerHintUsed] = useState(false);

  // L5: фото листочка (до 3)
  const [photos, setPhotos] = useState<string[]>([]);

  const [doneAttempt, setDoneAttempt] = useState<OlympiadTaskAttempt | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const ss = (id: string): StepState => stepStates[id] ?? emptyStep();
  function setSS(id: string, patch: Partial<StepState>) {
    setStepStates((m) => ({ ...m, [id]: { ...emptyStep(), ...m[id], ...patch } }));
  }

  const showGuidance = spec.reasoningMode === "guidedFull"; // L1–L2 ведём за руку
  const reward = problem.rewardStars;

  // ── проверка шага ──
  function checkStep(step: OlympiadStep) {
    const st = ss(step.id);
    let ok = false;
    const errs: string[] = [];
    if (step.kind === "info") {
      ok = true;
    } else if (step.kind === "choice" || step.kind === "findError") {
      ok = !!step.options?.find((o) => o.id === st.value)?.correct;
      if (!ok) errs.push("wrong_choice");
    } else if (step.kind === "order") {
      ok = JSON.stringify(st.order) === JSON.stringify(step.correctOrder ?? []);
      if (!ok) errs.push("wrong_order");
    } else if (step.kind === "expression") {
      ok = checkStepAnswer(step.accepted, st.value, true);
      if (!ok) errs.push("wrong_value");
      if (ok && step.actionKindOptions && step.actionKind && st.actionKind !== step.actionKind) {
        ok = false;
        errs.push("wrong_action_kind");
      }
      if (ok && step.explainOptions && !step.explainOptions.find((o) => o.id === st.explanation)?.correct) {
        ok = false;
        errs.push("wrong_explanation");
      }
    } else {
      ok = checkStepAnswer(step.accepted, st.value, false);
      if (!ok) errs.push("wrong_value");
    }

    const attempts = st.attempts + 1;
    setSS(step.id, {
      attempts,
      status: ok ? "correct" : "wrong",
      hadError: st.hadError || !ok,
      errorCodes: ok ? st.errorCodes : [...new Set([...st.errorCodes, ...errs])],
    });
  }

  function advance() {
    if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
    else setPhase("answer");
  }

  // ── сборка записи решения (5 частей) из шагов + свободного текста ──
  function buildSolutionRecord(): OlympiadSolutionRecord {
    const rec: OlympiadSolutionRecord = {
      selectedData: "",
      solutionPlan: "",
      solutionSteps: "",
      reasoningText: "",
      finalAnswer: answer.trim(),
    };
    const append = (f: SolutionField, line: string) => {
      rec[f] = rec[f] ? `${rec[f]}\n${line}` : line;
    };
    for (const step of steps) {
      const st = ss(step.id);
      const field: SolutionField = step.recordField ?? "solutionSteps";
      if (step.kind === "order") {
        const planLine = st.order
          .map((id, i) => `${i + 1}. ${step.options?.find((o) => o.id === id)?.label ?? id}`)
          .join("; ");
        if (planLine) append("solutionPlan", planLine);
      } else if (step.kind === "info") {
        // наблюдение — не записываем как ответ
      } else {
        const parts: string[] = [];
        if (st.actionKind) parts.push(`(${st.actionKind})`);
        if (st.value) parts.push(st.value);
        const why = step.explainOptions?.find((o) => o.id === st.explanation)?.label;
        if (why) append("reasoningText", `${step.title} — ${why}`);
        if (parts.length) append(field, `${step.title}: ${parts.join(" ")}`);
      }
    }
    if (reasoningText.trim()) append("reasoningText", reasoningText.trim());
    return rec;
  }

  function finish(answerCorrect: boolean, attemptsExhausted: boolean) {
    const stepResults: OlympiadStepResult[] = steps.map((step) => {
      const st = ss(step.id);
      return {
        stepId: step.id,
        value: step.kind === "order" ? st.order.join(",") : st.value,
        actionKind: st.actionKind,
        explanation: step.explainOptions?.find((o) => o.id === st.explanation)?.label,
        attempts: st.attempts,
        hintUsed: st.hintUsed,
        hadError: st.hadError,
        correct: st.status === "correct",
        errorCodes: st.errorCodes.length ? st.errorCodes : undefined,
      };
    });
    const summary = summarizeSteps(stepResults);
    const hintsUsed = summary.hintsUsed + (answerHintUsed ? 1 : 0);
    const rec = buildSolutionRecord();
    const reasoningCompleteness = computeReasoningCompleteness(rec, format);
    const status = computeAttemptStatus({
      level: problem.level,
      finalAnswerCorrect: answerCorrect,
      attemptsExhausted,
      hintsUsed,
      anyStepError: summary.anyStepError,
      reasoningCompleteness,
    });
    const errorCodes = [...summary.errorCodes];
    if (!answerCorrect) errorCodes.push("wrong_final_answer");

    const earned =
      status === "completed" ||
      status === "completed_with_hint" ||
      status === "needs_reasoning_revision" ||
      status === "pendingReview";

    const attempt: OlympiadTaskAttempt = {
      problemId: problem.id,
      themeId: problem.themeId,
      level: problem.level,
      recordingFormat: format,
      ...rec,
      steps: stepResults,
      hintsUsed,
      attempts: summary.totalStepAttempts + answerAttempts + (isWorksheet ? 1 : 0),
      errorCodes,
      selfCorrection: summary.selfCorrection,
      reasoningCompleteness,
      status,
      finalAnswerCorrect: answerCorrect,
      uploadedSolutionUrls: isWorksheet ? photos : undefined,
      rewardStars: earned ? reward : 0,
    };
    setDoneAttempt(attempt);
    setPhase("done");
    onComplete?.(attempt);
  }

  function submitAnswer() {
    const ok = checkFinalAnswer(problem, answer);
    const attempts = answerAttempts + 1;
    setAnswerAttempts(attempts);
    if (isWorksheet) {
      finish(ok, false); // L5 → pendingReview; авто-сверка как подсказка
      return;
    }
    if (ok) finish(true, false);
    else if (attempts >= MAX_ATTEMPTS) finish(false, true);
    else setAnswerWrong(true);
  }

  const answerHint = useMemo(() => {
    if (answerAttempts <= 0 || !problem.hints.length) return null;
    return problem.hints[Math.min(answerAttempts - 1, problem.hints.length - 1)] ?? null;
  }, [answerAttempts, problem.hints]);

  const currentStep = steps[stepIdx];

  return (
    <div className="olr">
      <div className="olr-statement">
        <div className="olr-levelbadge" title={spec.tagline}>{problem.level}</div>
        <h1>{problem.title}</h1>
        <p>{problem.statement}</p>
        {problem.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="olr-img" src={problem.imageUrl} alt="Схема к задаче" />
        )}
        {spec.reasoningMode === "actionByAction" && problem.actionCount != null && (
          <div className="olr-actioncount">Реши за {problem.actionCount} действия</div>
        )}
        <div className="olr-levelline">{spec.tagline}</div>
      </div>

      {phase === "steps" && currentStep && (
        <div className="olr-steps">
          <div className="olr-stepmeta">Шаг {stepIdx + 1} из {steps.length}</div>
          <StepView
            step={currentStep}
            state={ss(currentStep.id)}
            format={format}
            showGuidance={showGuidance}
            hintAllowed={spec.hintPolicy !== "none"}
            onChange={(patch) => setSS(currentStep.id, patch)}
            onUseHint={() => setSS(currentStep.id, { hintUsed: true })}
            onCheck={() => checkStep(currentStep)}
            onAdvance={advance}
          />
        </div>
      )}

      {phase === "answer" && (
        <div className="olr-answer">
          {isWorksheet ? (
            <>
              <h2>Реши на листочке</h2>
              <p className="olr-muted">
                Запиши полное решение на бумаге, сфотографируй (до 3 фото) и загрузи.
                Методист проверит ход решения.
              </p>
              <PhotoUpload photos={photos} onChange={setPhotos} />
            </>
          ) : format === "reasoning_text_builder" ? (
            <>
              <h2>Запиши рассуждение и ответ</h2>
              <label className="olr-fieldlabel">Объясни своими словами, почему так получается</label>
              <textarea
                className="olr-textarea"
                rows={3}
                value={reasoningText}
                placeholder="Например: я предположил, что все одинаковые, и сравнил…"
                onChange={(e) => setReasoningText(e.target.value)}
              />
            </>
          ) : (
            <h2>Запиши ответ</h2>
          )}

          {problem.answerScaffold && problem.answerScaffold.length > 0 && (
            <div className="olr-scaffold">
              {problem.answerScaffold.map((s, i) => (<span key={i}>{s} ___</span>))}
            </div>
          )}

          <label className="olr-fieldlabel">Ответ</label>
          <input
            className="olr-input olr-answer-input"
            value={answer}
            placeholder="Твой ответ…"
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && answer.trim()) submitAnswer(); }}
          />

          {answerWrong && (
            <div className="olr-feedback wrong">
              Пока не верно. Попытка {answerAttempts} из {MAX_ATTEMPTS}.
              {answerHint && !answerHintUsed && (
                <button className="olr-hint-btn" onClick={() => setAnswerHintUsed(true)}>💡 Подсказка</button>
              )}
              {answerHint && answerHintUsed && <div className="olr-hint">💡 {answerHint}</div>}
            </div>
          )}

          <button
            className="olr-cta"
            disabled={!answer.trim() || (isWorksheet && photos.length === 0)}
            onClick={submitAnswer}
          >
            {isWorksheet ? "Отправить решение" : "Проверить ответ"}
          </button>
        </div>
      )}

      {phase === "done" && doneAttempt && (
        <div className={`olr-result ${doneAttempt.status}`}>
          <ResultHeader status={doneAttempt.status} reward={doneAttempt.rewardStars} />
          {problem.breakdown && (
            <div className="olr-breakdown-wrap">
              {!showBreakdown ? (
                <button className="olr-cta ghost" onClick={() => setShowBreakdown(true)}>📖 Посмотреть разбор</button>
              ) : (
                <Breakdown b={problem.breakdown} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultHeader({ status, reward }: { status: OlympiadTaskAttempt["status"]; reward: number }) {
  if (status === "completed")
    return (<><b>Верно и чисто! 🎉 +{reward} ★</b><span>Отличное рассуждение, без подсказок. Так держать!</span></>);
  if (status === "completed_with_hint")
    return (<><b>Верно! 👍 +{reward} ★</b><span>Ответ правильный — но были подсказки или ошибки на шагах. Серия «без ошибок» начинается заново.</span></>);
  if (status === "needs_reasoning_revision")
    return (<><b>Ответ верный, но решение надо дописать ✍️</b><span>Чтобы засчитать «чисто», запиши рассуждение подробнее. Это не ошибка — просто доработка.</span></>);
  if (status === "pendingReview")
    return (<><b>Решение отправлено методисту 📨</b><span>Листочек уйдёт на проверку. Авто-сверка ответа — лишь подсказка.</span></>);
  return (<><b>Пока не получилось</b><span>Это нормально! Посмотри разбор — задача попадёт в доработки.</span></>);
}

function Breakdown({ b }: { b: NonNullable<OlympiadProblemV2["breakdown"]> }) {
  return (
    <div className="olr-breakdown">
      <h3>Разбор</h3>
      <div className="olr-bd-row"><b>Что известно:</b> {b.known}</div>
      <div className="olr-bd-row"><b>Идея:</b> {b.idea}</div>
      <div className="olr-bd-row"><b>Шаги:</b>
        <ol>{b.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>
      <div className="olr-bd-row"><b>Запись решения:</b> {b.writtenSolution}</div>
      <div className="olr-bd-row"><b>Ответ:</b> {b.answer}</div>
      <div className="olr-bd-row"><b>Проверь себя:</b> {b.selfCheck}</div>
    </div>
  );
}

function PhotoUpload({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  return (
    <div className="olr-photos">
      {photos.map((name, i) => (
        <div key={i} className="olr-photo-item">
          📷 {name}
          <button className="olr-photo-del" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="Удалить фото">✕</button>
        </div>
      ))}
      {photos.length < 3 && (
        <label className="olr-upload">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange([...photos, f.name]);
              e.currentTarget.value = "";
            }}
          />
          <span>📷 Добавить фото ({photos.length}/3)</span>
        </label>
      )}
    </div>
  );
}

function StepView({
  step, state, format, showGuidance, hintAllowed, onChange, onUseHint, onCheck, onAdvance,
}: {
  step: OlympiadStep;
  state: StepState;
  format: string;
  showGuidance: boolean;
  hintAllowed: boolean;
  onChange: (patch: Partial<StepState>) => void;
  onUseHint: () => void;
  onCheck: () => void;
  onAdvance: () => void;
}) {
  const solved = state.status === "correct";
  const hintAvailable = !!step.hint && hintAllowed && state.attempts >= 1 && !solved;
  const isAction = format === "action_explanation_choice";

  return (
    <div className="olr-step">
      <h3>{step.blankLabel ? step.blankLabel : step.title}</h3>
      {showGuidance && step.guidance && <p className="olr-guidance">{step.guidance}</p>}

      {isAction && step.actionKindOptions && (
        <div className="olr-actionkinds">
          <span className="olr-muted">Что это за действие?</span>
          <div className="olr-chips">
            {step.actionKindOptions.map((k) => (
              <button key={k} className={`olr-chip ${state.actionKind === k ? "on" : ""}`} disabled={solved} onClick={() => onChange({ actionKind: k })}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {(step.kind === "choice" || step.kind === "findError") && step.options && (
        <div className="olr-options">
          {step.options.map((o) => (
            <button key={o.id} className={`olr-option ${state.value === o.id ? "sel" : ""} ${solved && o.correct ? "ok" : ""}`} disabled={solved} onClick={() => onChange({ value: o.id })}>{o.label}</button>
          ))}
        </div>
      )}

      {step.kind === "order" && step.options && (
        <OrderPicker options={step.options} chosen={state.order} disabled={solved} onChange={(order) => onChange({ order })} />
      )}

      {(step.kind === "number" || step.kind === "expression") && (
        <input
          className="olr-input"
          value={state.value}
          placeholder={step.kind === "expression" ? "Например: 20 ÷ 4" : "Число"}
          disabled={solved}
          onChange={(e) => onChange({ value: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") onCheck(); }}
        />
      )}

      {isAction && step.explainOptions && (
        <div className="olr-explain">
          <span className="olr-muted">Почему так?</span>
          <div className="olr-options">
            {step.explainOptions.map((o) => (
              <button key={o.id} className={`olr-option ${state.explanation === o.id ? "sel" : ""} ${solved && o.correct ? "ok" : ""}`} disabled={solved} onClick={() => onChange({ explanation: o.id })}>{o.label}</button>
            ))}
          </div>
        </div>
      )}

      {state.status === "wrong" && (
        <div className="olr-feedback wrong">
          Не то. Попробуй ещё. Попытка {state.attempts}.
          {hintAvailable && (state.hintUsed
            ? <div className="olr-hint">💡 {step.hint}</div>
            : <button className="olr-hint-btn" onClick={onUseHint}>💡 Подсказка</button>)}
        </div>
      )}

      <div className="olr-step-actions">
        {step.kind === "info" ? (
          <button className="olr-cta" onClick={onAdvance}>Понятно →</button>
        ) : solved ? (
          <button className="olr-cta" onClick={onAdvance}>Дальше →</button>
        ) : (
          <button
            className="olr-cta"
            disabled={
              (step.kind === "order" && state.order.length !== (step.options?.length ?? 0)) ||
              ((step.kind === "number" || step.kind === "expression") && !state.value.trim()) ||
              ((step.kind === "choice" || step.kind === "findError") && !state.value) ||
              (isAction && !!step.actionKindOptions && !state.actionKind) ||
              (isAction && !!step.explainOptions && !state.explanation)
            }
            onClick={onCheck}
          >Проверить</button>
        )}
      </div>
    </div>
  );
}

function OrderPicker({ options, chosen, disabled, onChange }: {
  options: { id: string; label: string }[];
  chosen: string[];
  disabled: boolean;
  onChange: (order: string[]) => void;
}) {
  const remaining = options.filter((o) => !chosen.includes(o.id));
  return (
    <div className="olr-order">
      <div className="olr-order-chosen">
        {chosen.length === 0 && <span className="olr-muted">Нажимай пункты в нужном порядке…</span>}
        {chosen.map((id, i) => {
          const o = options.find((x) => x.id === id)!;
          return (<div key={id} className="olr-order-item"><b>{i + 1}.</b> {o.label}</div>);
        })}
      </div>
      <div className="olr-order-pool">
        {remaining.map((o) => (
          <button key={o.id} className="olr-order-btn" disabled={disabled} onClick={() => onChange([...chosen, o.id])}>{o.label}</button>
        ))}
        {chosen.length > 0 && !disabled && (
          <button className="olr-order-reset" onClick={() => onChange([])}>↺ Сбросить</button>
        )}
      </div>
    </div>
  );
}
