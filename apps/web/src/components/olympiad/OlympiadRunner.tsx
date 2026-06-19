"use client";

/**
 * Универсальный олимпиадный раннер: одна задача, отрисовка зависит от УРОВНЯ (метода).
 *
 *  guidedFull (L1–L2)  — пошагово, с описаниями шагов и подсказками.
 *  guidedCompact (L3)  — шаги без описаний; есть «расставь план», подсказок минимум.
 *  actionByAction (L4) — видно число действий; на каждом: тип действия + выражение.
 *  worksheet (L5)      — чистый лист: фото + ответ, авто-проверка + методист.
 *  algebraic (L6)      — минимальная запись: сразу поле ответа.
 *
 * «Раннер под тему» обеспечивается ДАННЫМИ (steps в банке задач), а отрисовка — общая.
 */

import { useMemo, useState } from "react";
import type { OlympiadProblemV2, OlympiadStep, LevelSpec } from "@/types/olympiad";
import { LEVEL_SPECS } from "@/types/olympiad";
import {
  MAX_ATTEMPTS,
  checkStepAnswer,
  checkFinalAnswer,
} from "@/lib/olympiad-progress";

type StepState = {
  value: string;
  actionKind?: string;
  order: string[]; // для order-шага
  attempts: number;
  status: "idle" | "wrong" | "correct";
};

function emptyStep(): StepState {
  return { value: "", order: [], attempts: 0, status: "idle" };
}

export function OlympiadRunner({
  problem,
  onComplete,
}: {
  problem: OlympiadProblemV2;
  /** Вызывается, когда задача завершена. correct — верен ли финальный ответ. */
  onComplete?: (correct: boolean, attemptsUsed?: number) => void;
}) {
  const spec: LevelSpec = LEVEL_SPECS[problem.level];
  const steps = problem.steps ?? [];
  const hasSteps = steps.length > 0 && spec.reasoningMode !== "worksheet";

  const [stepIdx, setStepIdx] = useState(0);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [phase, setPhase] = useState<"steps" | "answer" | "done">(
    hasSteps ? "steps" : "answer",
  );

  // финальный ответ
  const [answer, setAnswer] = useState("");
  const [answerAttempts, setAnswerAttempts] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<"idle" | "wrong" | "correct" | "failed" | "submitted">("idle");
  const [photoName, setPhotoName] = useState<string | null>(null);

  const ss = (id: string): StepState => stepStates[id] ?? emptyStep();
  function setSS(id: string, patch: Partial<StepState>) {
    setStepStates((m) => ({ ...m, [id]: { ...emptyStep(), ...m[id], ...patch } }));
  }

  const showGuidance = spec.reasoningMode === "guidedFull";
  const reward = problem.rewardStars;

  function logAttempt(correct: boolean | null) {
    void fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: problem.id, mode: "olympiad", isCorrect: correct }),
    }).catch(() => {});
  }

  // ── проверка шага ──
  function checkStep(step: OlympiadStep) {
    const st = ss(step.id);
    let ok = false;
    if (step.kind === "info") {
      ok = true;
    } else if (step.kind === "choice" || step.kind === "findError") {
      const chosen = step.options?.find((o) => o.id === st.value);
      ok = !!chosen?.correct;
    } else if (step.kind === "order") {
      ok = JSON.stringify(st.order) === JSON.stringify(step.correctOrder ?? []);
    } else if (step.kind === "expression") {
      ok = checkStepAnswer(step.accepted, st.value, true);
      // L4: верный тип действия тоже обязателен
      if (ok && step.actionKindOptions && step.actionKind) {
        ok = st.actionKind === step.actionKind;
      }
    } else {
      ok = checkStepAnswer(step.accepted, st.value, false);
    }

    const attempts = st.attempts + 1;
    if (ok) {
      setSS(step.id, { attempts, status: "correct" });
    } else {
      setSS(step.id, { attempts, status: "wrong" });
    }
  }

  function advance() {
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setPhase("answer");
    }
  }

  // ── проверка финального ответа ──
  function submitAnswer() {
    const ok = checkFinalAnswer(problem, answer);
    const attempts = answerAttempts + 1;
    setAnswerAttempts(attempts);

    if (spec.reasoningMode === "worksheet") {
      // L5: уходит методисту в любом случае; авто-проверка ответа — подсказка ребёнку.
      setAnswerStatus("submitted");
      logAttempt(ok ? true : null);
      setPhase("done");
      onComplete?.(ok, attempts);
      return;
    }

    if (ok) {
      setAnswerStatus("correct");
      logAttempt(true);
      setPhase("done");
      onComplete?.(true, attempts);
    } else if (attempts >= MAX_ATTEMPTS) {
      setAnswerStatus("failed");
      logAttempt(false);
      setPhase("done");
      onComplete?.(false, attempts);
    } else {
      setAnswerStatus("wrong");
    }
  }

  // нарастающая подсказка к ответу: показываем по числу попыток
  const answerHint = useMemo(() => {
    if (answerAttempts <= 0) return null;
    const i = Math.min(answerAttempts - 1, problem.hints.length - 1);
    return problem.hints[i] ?? null;
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

      {/* ── ШАГИ (guided / compact / actionByAction) ── */}
      {phase === "steps" && currentStep && (
        <div className="olr-steps">
          <div className="olr-stepmeta">
            Шаг {stepIdx + 1} из {steps.length}
          </div>
          <StepView
            step={currentStep}
            state={ss(currentStep.id)}
            mode={spec.reasoningMode}
            showGuidance={showGuidance}
            hintPolicy={spec.hintPolicy}
            onChange={(patch) => setSS(currentStep.id, patch)}
            onCheck={() => checkStep(currentStep)}
            onAdvance={advance}
          />
        </div>
      )}

      {/* ── ФИНАЛЬНЫЙ ОТВЕТ / ЛИСТОЧЕК ── */}
      {phase === "answer" && (
        <div className="olr-answer">
          {spec.reasoningMode === "worksheet" ? (
            <>
              <h2>Реши на листочке</h2>
              <p className="olr-muted">
                Запиши полное решение на бумаге, сфотографируй и загрузи. Методист проверит ход решения.
              </p>
              <label className="olr-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                />
                <span>{photoName ? `📷 ${photoName}` : "📷 Загрузить фото листочка"}</span>
              </label>
            </>
          ) : (
            <h2>Запиши ответ</h2>
          )}

          {problem.answerScaffold && problem.answerScaffold.length > 0 && (
            <div className="olr-scaffold">
              {problem.answerScaffold.map((s, i) => (
                <span key={i}>{s} ___</span>
              ))}
            </div>
          )}

          <input
            className="olr-input olr-answer-input"
            value={answer}
            placeholder="Твой ответ…"
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answer.trim()) submitAnswer();
            }}
          />

          {answerStatus === "wrong" && (
            <div className="olr-feedback wrong">
              Пока не верно. Попытка {answerAttempts} из {MAX_ATTEMPTS}.
              {answerHint && <div className="olr-hint">💡 {answerHint}</div>}
            </div>
          )}

          <button
            className="olr-cta"
            disabled={
              !answer.trim() ||
              (spec.reasoningMode === "worksheet" && !photoName)
            }
            onClick={submitAnswer}
          >
            {spec.reasoningMode === "worksheet" ? "Отправить решение" : "Проверить ответ"}
          </button>
        </div>
      )}

      {/* ── ИТОГ ── */}
      {phase === "done" && (
        <div className={`olr-result ${answerStatus}`}>
          {answerStatus === "correct" && (
            <>
              <b>Верно! 🎉 +{reward} ★</b>
              <span>Отличное рассуждение. Так держать!</span>
            </>
          )}
          {answerStatus === "submitted" && (
            <>
              <b>Решение отправлено методисту 📨</b>
              <span>
                {checkFinalAnswer(problem, answer)
                  ? "Ответ похож на верный — ждём подтверждения методиста."
                  : "Методист посмотрит ход решения на листочке."}
              </span>
            </>
          )}
          {answerStatus === "failed" && (
            <>
              <b>Пока не получилось</b>
              <span>Это нормально! Посмотрим разбор вместе — задача попадёт в доработки.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Отрисовка одного шага
// ─────────────────────────────────────────────────────────────

function StepView({
  step,
  state,
  mode,
  showGuidance,
  hintPolicy,
  onChange,
  onCheck,
  onAdvance,
}: {
  step: OlympiadStep;
  state: StepState;
  mode: LevelSpec["reasoningMode"];
  showGuidance: boolean;
  hintPolicy: LevelSpec["hintPolicy"];
  onChange: (patch: Partial<StepState>) => void;
  onCheck: () => void;
  onAdvance: () => void;
}) {
  const solved = state.status === "correct";
  // Подсказка к шагу доступна со 2-й попытки и только если уровень это допускает.
  const hintAvailable =
    !!step.hint && hintPolicy !== "none" && state.attempts >= 1 && !solved;

  return (
    <div className="olr-step">
      <h3>{step.title}</h3>
      {showGuidance && step.guidance && <p className="olr-guidance">{step.guidance}</p>}

      {/* L4: выбор типа действия */}
      {mode === "actionByAction" && step.actionKindOptions && (
        <div className="olr-actionkinds">
          <span className="olr-muted">Что это за действие?</span>
          <div className="olr-chips">
            {step.actionKindOptions.map((k) => (
              <button
                key={k}
                className={`olr-chip ${state.actionKind === k ? "on" : ""}`}
                disabled={solved}
                onClick={() => onChange({ actionKind: k })}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* выбор варианта */}
      {(step.kind === "choice" || step.kind === "findError") && step.options && (
        <div className="olr-options">
          {step.options.map((o) => (
            <button
              key={o.id}
              className={`olr-option ${state.value === o.id ? "sel" : ""} ${
                solved && o.correct ? "ok" : ""
              }`}
              disabled={solved}
              onClick={() => onChange({ value: o.id })}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* расставить план по порядку */}
      {step.kind === "order" && step.options && (
        <OrderPicker
          options={step.options}
          chosen={state.order}
          disabled={solved}
          onChange={(order) => onChange({ order })}
        />
      )}

      {/* ввод числа/выражения */}
      {(step.kind === "number" || step.kind === "expression") && (
        <input
          className="olr-input"
          value={state.value}
          placeholder={step.kind === "expression" ? "Например: 20 ÷ 4" : "Число"}
          disabled={solved}
          onChange={(e) => onChange({ value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCheck();
          }}
        />
      )}

      {state.status === "wrong" && (
        <div className="olr-feedback wrong">
          Не то. Попробуй ещё. Попытка {state.attempts}.
          {hintAvailable && <div className="olr-hint">💡 {step.hint}</div>}
        </div>
      )}

      {/* действия */}
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
              (mode === "actionByAction" && !!step.actionKindOptions && !state.actionKind)
            }
            onClick={onCheck}
          >
            Проверить
          </button>
        )}
      </div>
    </div>
  );
}

function OrderPicker({
  options,
  chosen,
  disabled,
  onChange,
}: {
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
          return (
            <div key={id} className="olr-order-item">
              <b>{i + 1}.</b> {o.label}
            </div>
          );
        })}
      </div>
      <div className="olr-order-pool">
        {remaining.map((o) => (
          <button
            key={o.id}
            className="olr-order-btn"
            disabled={disabled}
            onClick={() => onChange([...chosen, o.id])}
          >
            {o.label}
          </button>
        ))}
        {chosen.length > 0 && !disabled && (
          <button className="olr-order-reset" onClick={() => onChange([])}>
            ↺ Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
