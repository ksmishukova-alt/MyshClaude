"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskContent, TaskStep, StepStat } from "@/types/domain";
import { SUBJECTS, computeAutonomy } from "@/types/domain";
import { modeLabel, modeIcon } from "@/lib/status";
import { ReadingTimer } from "@/components/ReadingTimer";

type StepPhase = "solving" | "correct" | "wrong";

interface StepState {
  attempts: number;
  hintUsed: boolean;
  phase: StepPhase;
  selected: string | null;
  input: string;
  solvedFirstTry: boolean;
}

function freshStep(): StepState {
  return { attempts: 0, hintUsed: false, phase: "solving", selected: null, input: "", solvedFirstTry: false };
}

export function TaskScreen({ task, nextTaskId }: { task: TaskContent; nextTaskId: string | null }) {
  const router = useRouter();
  const subject = SUBJECTS[task.subjectId];

  const isWorksheet = task.mode === "worksheet";
  const steps: TaskStep[] = task.steps ?? [];

  const [uploaded, setUploaded] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [states, setStates] = useState<StepState[]>(() => steps.map(freshStep));

  if (isWorksheet) {
    return (
      <WorksheetView
        task={task}
        subjectTitle={subject.title}
        uploaded={uploaded}
        onUpload={() => setUploaded(true)}
        onBack={() => router.push(`/daily/${task.subjectId}`)}
        onNext={() => (nextTaskId ? router.push(`/daily/${task.subjectId}/${nextTaskId}`) : router.push("/"))}
        nextTaskId={nextTaskId}
      />
    );
  }

  const step = steps[stepIdx];
  const st = states[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const hasOptions = (step.options?.length ?? 0) > 0;
  const isReading = step.kind === "reading";

  function patch(p: Partial<StepState>) {
    setStates((arr) => arr.map((s, i) => (i === stepIdx ? { ...s, ...p } : s)));
  }

  function check() {
    let ok = false;
    if (hasOptions) {
      ok = !!step.options!.find((o) => o.id === st.selected)?.isCorrect;
    } else {
      ok =
        step.correctInput === undefined || step.correctInput === ""
          ? st.input.trim().length > 0
          : st.input.trim().toLowerCase() === step.correctInput.trim().toLowerCase();
    }
    const attempts = st.attempts + 1;
    patch({
      attempts,
      phase: ok ? "correct" : "wrong",
      solvedFirstTry: ok && attempts === 1 && !st.hintUsed ? true : st.solvedFirstTry,
    });
  }

  function buildReport() {
    const stats: StepStat[] = steps.map((s, i) => {
      const ss = states[i];
      const answerable = s.kind === "question";
      const solvedCorrect = ss.phase === "correct";
      return {
        stepId: s.id,
        attempts: ss.attempts,
        hintUsed: ss.hintUsed,
        solvedFirstTry: ss.solvedFirstTry,
        skippedWithError: answerable && !solvedCorrect,
      };
    });
    return { taskId: task.id, steps: stats, autonomyScore: computeAutonomy(stats) };
  }

  function goForward() {
    if (isLast) {
      const report = buildReport();
      // отправляем попытку и аналитику; на моках API вернёт ok:false — это нормально
      void fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "",
          taskId: task.id,
          childId: "",
          mode: task.mode,
          isCorrect: states.every((s) => s.phase === "correct"),
          autonomyScore: report.autonomyScore,
          steps: report.steps,
        }),
      }).catch(() => {});
      router.push(nextTaskId ? `/daily/${task.subjectId}/${nextTaskId}` : "/");
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function goBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else router.push(`/daily/${task.subjectId}`);
  }

  const canCheck = hasOptions ? st.selected !== null : st.input.trim().length > 0;
  const hintAvailable = !!step.hint && st.attempts >= 1; // подсказка только со 2-й попытки
  const stars = st.hintUsed ? 5 : 10;

  return (
    <main className="task-stage" aria-label={`${subject.title}: ${task.title}`}>
      <div className="task-card-wrap wide">
        <header className="ts-top">
          <button className="ts-back" onClick={goBack}>← {stepIdx > 0 ? "Назад" : "К заданиям"}</button>
          <div className="ts-progress">
            {steps.length > 1 ? `Шаг ${stepIdx + 1} из ${steps.length}` : `Задание ${task.order} из ${task.total}`}
          </div>
          <span className="ts-mode" title={modeLabel(task.mode)}>{modeIcon(task.mode)} {modeLabel(task.mode)}</span>
        </header>

        <div className="ts-single">
          <h1 className="ts-title">{task.title}</h1>
          {step.passage && isReading && (
            <blockquote className="ts-passage">{step.passage}</blockquote>
          )}
          {step.passage && !isReading && (
            <details className="ts-passage-toggle">
              <summary>📖 Перечитать текст</summary>
              <blockquote className="ts-passage">{step.passage}</blockquote>
            </details>
          )}
          <p className="ts-prompt">{step.prompt}</p>

          {isReading && (
            <div className="ts-actions">
              <button className="ts-cta" onClick={goForward}>
                {isLast ? (nextTaskId ? "Следующая задача →" : "Готово") : "Далее →"}
              </button>
            </div>
          )}

          {!isReading && hasOptions && (
            <div className="ts-options">
              {step.options!.map((o) => {
                let cls = "ts-opt";
                if (st.phase === "solving" && st.selected === o.id) cls += " sel";
                if (st.phase !== "solving") {
                  if (o.isCorrect) cls += " ok";
                  else if (st.selected === o.id) cls += " no";
                }
                return (
                  <button key={o.id} className={cls} disabled={st.phase === "correct"}
                    onClick={() => patch({ selected: o.id, phase: "solving" })}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}

          {!isReading && step.readingTimerMinutes && (
            <ReadingTimer goalMinutes={step.readingTimerMinutes} />
          )}

          {!isReading && !hasOptions && (
            <textarea className="ts-input" placeholder="Напиши свой ответ…" value={st.input}
              disabled={st.phase === "correct"} onChange={(e) => patch({ input: e.target.value })} rows={3} />
          )}

          {!isReading && hintAvailable && st.phase !== "correct" && (
            <div className="ts-hint-row">
              <button className="ts-hint-btn" onClick={() => patch({ hintUsed: true })}>💡 Подсказка</button>
            </div>
          )}
          {!isReading && st.hintUsed && step.hint && <div className="ts-hint">{step.hint}</div>}

          {!isReading && st.phase === "correct" && (
            <div className="ts-result ok"><b>Верно! 🎉</b><span>+{stars} ⭐ {st.hintUsed && "(с подсказкой)"}</span></div>
          )}
          {!isReading && st.phase === "wrong" && (
            <div className="ts-result no"><b>Пока неверно 💪</b><span>Можешь попробовать ещё или пойти дальше</span></div>
          )}

          {!isReading && (
            <div className="ts-actions">
              {st.phase !== "correct" && (
                <button className="ts-cta secondary" disabled={!canCheck} onClick={check}>Проверить</button>
              )}
              <button className="ts-cta" onClick={goForward}>
                {isLast ? (nextTaskId ? "Следующая задача →" : "Завершить задание") : "Следующий вопрос →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function WorksheetView({
  task, subjectTitle, uploaded, onUpload, onBack, onNext, nextTaskId,
}: {
  task: TaskContent; subjectTitle: string; uploaded: boolean;
  onUpload: () => void; onBack: () => void; onNext: () => void; nextTaskId: string | null;
}) {
  return (
    <main className="task-stage" aria-label={`${subjectTitle}: ${task.title}`}>
      <div className="task-card-wrap wide">
        <header className="ts-top">
          <button className="ts-back" onClick={onBack}>← К заданиям</button>
          <div className="ts-progress">Задание {task.order} из {task.total}</div>
          <span className="ts-mode">{modeIcon("worksheet")} {modeLabel("worksheet")}</span>
        </header>
        <div className="ts-single">
          <h1 className="ts-title">{task.title}</h1>
          <p className="ts-prompt">{task.prompt}</p>
          {!uploaded ? (
            <button className="ts-upload" onClick={onUpload}>
              <span className="ts-upload-ic">📷</span>
              <span>Сфотографировать решение</span>
              <small>Нажми, чтобы загрузить фото с листочка</small>
            </button>
          ) : (
            <>
              <div className="ts-upload-done">
                <span className="ts-upload-ic">✅</span>
                <p>Решение отправлено взрослому на проверку</p>
              </div>
              <div className="ts-actions">
                <button className="ts-cta" onClick={onNext}>{nextTaskId ? "Следующая задача →" : "Готово, на главную"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
