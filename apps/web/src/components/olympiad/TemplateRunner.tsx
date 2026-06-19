"use client";

/**
 * Раннер «шаблон решения с пропусками» (ТЗ §9, формат заданий «Головы и ноги»).
 * Ребёнок заполняет ВЕСЬ текст решения: числа/выражения вводит, вид существа и
 * ключевые числа выбирает карточками. Проверяется каждый пропуск — это и есть
 * «запись решения», а не только ответ. Собирает OlympiadTaskAttempt.
 */

import { useMemo, useState } from "react";
import type {
  OlympiadProblemV2,
  TemplateBlank,
  TemplateSegment,
  OlympiadStepResult,
  OlympiadSolutionRecord,
  OlympiadTaskAttempt,
  SolutionField,
} from "@/types/olympiad";
import { LEVEL_SPECS, computeReasoningCompleteness } from "@/types/olympiad";
import { MAX_ATTEMPTS, checkBlank, computeAttemptStatus } from "@/lib/olympiad-progress";

type BlankState = { value: string; hadError: boolean; result?: boolean };

function isBlank(s: TemplateSegment): s is { blank: TemplateBlank } {
  return (s as { blank?: TemplateBlank }).blank !== undefined;
}

export function TemplateRunner({
  problem,
  onComplete,
}: {
  problem: OlympiadProblemV2;
  onComplete?: (attempt: OlympiadTaskAttempt) => void;
}) {
  const spec = LEVEL_SPECS[problem.level];
  const segments = problem.template?.segments ?? [];
  const blanks = useMemo(() => segments.filter(isBlank).map((s) => s.blank), [segments]);

  const [states, setStates] = useState<Record<string, BlankState>>({});
  const [attempts, setAttempts] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [done, setDone] = useState<OlympiadTaskAttempt | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [wrongShown, setWrongShown] = useState(false);

  const bs = (id: string): BlankState => states[id] ?? { value: "", hadError: false };
  const setBS = (id: string, patch: Partial<BlankState>) =>
    setStates((m) => ({ ...m, [id]: { ...bs(id), ...patch } }));

  const allFilled = blanks.every((b) => (bs(b.id).value ?? "").trim().length > 0);

  function buildRecord(): OlympiadSolutionRecord {
    const rec: OlympiadSolutionRecord = {
      selectedData: "", solutionPlan: "", solutionSteps: "", reasoningText: "", finalAnswer: "",
    };
    const append = (f: SolutionField, line: string) => {
      rec[f] = rec[f] ? `${rec[f]} ${line}` : line;
    };
    for (const b of blanks) {
      const v = bs(b.id).value;
      if (!v) continue;
      const label = b.kind === "card" ? b.options?.find((o) => o.id === v)?.label ?? v : v;
      append(b.field ?? "solutionSteps", label);
    }
    return rec;
  }

  function check() {
    const next: Record<string, BlankState> = {};
    let allCorrect = true;
    for (const b of blanks) {
      const st = bs(b.id);
      const ok = checkBlank(b, st.value);
      if (!ok) allCorrect = false;
      next[b.id] = { ...st, result: ok, hadError: st.hadError || !ok };
    }
    setStates((m) => ({ ...m, ...next }));
    const used = attempts + 1;
    setAttempts(used);
    setWrongShown(!allCorrect);
    if (allCorrect) finish(true, false, next);
    else if (used >= MAX_ATTEMPTS) finish(false, true, next);
  }

  function finish(correct: boolean, exhausted: boolean, results: Record<string, BlankState>) {
    const rec = buildRecord();
    const answerBlank = blanks.find((b) => b.field === "finalAnswer");
    if (answerBlank) rec.finalAnswer = bs(answerBlank.id).value;
    const stepResults: OlympiadStepResult[] = blanks.map((b) => ({
      stepId: b.id,
      value: bs(b.id).value,
      attempts,
      hintUsed,
      hadError: results[b.id]?.hadError ?? false,
      correct: results[b.id]?.result ?? false,
      errorCodes: results[b.id]?.result ? undefined : ["wrong_blank"],
    }));
    const anyStepError = stepResults.some((s) => s.hadError);
    const reasoningCompleteness = computeReasoningCompleteness(rec, spec.recordingFormat);
    const status = computeAttemptStatus({
      level: problem.level,
      finalAnswerCorrect: correct,
      attemptsExhausted: exhausted,
      hintsUsed: hintUsed ? 1 : 0,
      anyStepError,
      reasoningCompleteness,
    });
    const earned = status !== "failed";
    const attempt: OlympiadTaskAttempt = {
      problemId: problem.id,
      themeId: problem.themeId,
      level: problem.level,
      recordingFormat: spec.recordingFormat,
      ...rec,
      steps: stepResults,
      hintsUsed: hintUsed ? 1 : 0,
      attempts,
      errorCodes: anyStepError ? ["wrong_blank"] : [],
      selfCorrection: anyStepError && correct && !hintUsed,
      reasoningCompleteness,
      status,
      finalAnswerCorrect: correct,
      rewardStars: earned ? problem.rewardStars : 0,
    };
    setDone(attempt);
    onComplete?.(attempt);
  }

  const hint = problem.hints[Math.min(Math.max(attempts - 1, 0), problem.hints.length - 1)];

  return (
    <div className="olr">
      <div className="olr-statement">
        <div className="olr-levelbadge" title={spec.tagline}>{problem.level}</div>
        <h1>{problem.title}</h1>
        <p>{problem.statement}</p>
        <div className="olr-levelline">{spec.tagline}</div>
      </div>

      <div className="tpl">
        {problem.template?.lead && <p className="tpl-lead">{problem.template.lead}</p>}
        <p className="tpl-body">
          {segments.map((seg, i) => {
            if (!isBlank(seg)) return <span key={i}>{seg.text}</span>;
            const b = seg.blank;
            const st = bs(b.id);
            const cls = st.result === true ? "ok" : st.result === false ? "bad" : "";
            if (b.kind === "card") {
              return (
                <span key={i} className="tpl-cards">
                  {b.options?.map((o) => (
                    <button
                      key={o.id}
                      className={`tpl-card ${st.value === o.id ? "sel" : ""} ${st.result === true && o.id === st.value ? "ok" : ""} ${st.result === false && o.id === st.value ? "bad" : ""}`}
                      disabled={!!done}
                      onClick={() => setBS(b.id, { value: o.id, result: undefined })}
                    >{o.label}</button>
                  ))}
                </span>
              );
            }
            return (
              <input
                key={i}
                className={`tpl-blank ${cls}`}
                value={st.value}
                placeholder={b.placeholder ?? "…"}
                disabled={!!done}
                onChange={(e) => setBS(b.id, { value: e.target.value, result: undefined })}
              />
            );
          })}
        </p>

        {wrongShown && !done && (
          <div className="olr-feedback wrong">
            Не все пропуски верны. Попытка {attempts} из {MAX_ATTEMPTS}. Исправь подсвеченные.
            {problem.hints.length > 0 && (hintUsed
              ? <div className="olr-hint">💡 {hint}</div>
              : <button className="olr-hint-btn" onClick={() => setHintUsed(true)}>💡 Подсказка</button>)}
          </div>
        )}

        {!done && (
          <button className="olr-cta" disabled={!allFilled} onClick={check}>Проверить решение</button>
        )}
      </div>

      {done && (
        <div className={`olr-result ${done.status}`}>
          {done.status === "completed" && (<><b>Верно и чисто! 🎉 +{done.rewardStars} ★</b><span>Ты записал всё решение целиком. Отлично!</span></>)}
          {done.status === "completed_with_hint" && (<><b>Верно! 👍 +{done.rewardStars} ★</b><span>Были подсказки или ошибки в пропусках — серия «без ошибок» начинается заново.</span></>)}
          {done.status === "needs_reasoning_revision" && (<><b>Почти! Допиши решение ✍️</b><span>Заполни все части решения, чтобы засчитать «чисто».</span></>)}
          {done.status === "failed" && (<><b>Пока не получилось</b><span>Посмотри разбор — задача попадёт в доработки.</span></>)}
          {problem.breakdown && (
            !showBreakdown ? (
              <button className="olr-cta ghost" onClick={() => setShowBreakdown(true)}>📖 Посмотреть разбор</button>
            ) : (
              <div className="olr-breakdown">
                <h3>Разбор</h3>
                <div className="olr-bd-row"><b>Что известно:</b> {problem.breakdown.known}</div>
                <div className="olr-bd-row"><b>Идея:</b> {problem.breakdown.idea}</div>
                <div className="olr-bd-row"><b>Шаги:</b><ol>{problem.breakdown.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
                <div className="olr-bd-row"><b>Запись решения:</b> {problem.breakdown.writtenSolution}</div>
                <div className="olr-bd-row"><b>Ответ:</b> {problem.breakdown.answer}</div>
                <div className="olr-bd-row"><b>Проверь себя:</b> {problem.breakdown.selfCheck}</div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
