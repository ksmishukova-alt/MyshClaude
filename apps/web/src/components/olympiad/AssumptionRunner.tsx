"use client";

/**
 * Раннер метода предположения (Головы и ноги). ОДИН ЭКРАН = ОДИН ШАГ РЕШЕНИЯ.
 * Ребёнок сам считает, опираясь на точные вопросы. Экраны генерируются из данных
 * задачи (AssumptionTask). Поддержка снимается по уровню (ТЗ §9):
 *   L1 — показаны формулы-подсказки;
 *   L2 — формулы убраны, ребёнок считает числа;
 *   L3 — в записи решения пустеют и формулировки (карточки-слова);
 *   L4 — весь расчёт собирается из карточек в одном окне;
 *   L5 — на листочке (фото + ответ, проверка методиста).
 * Финал — «Запиши решение словами»: сборка опорного конспекта из карточек.
 */

import { useMemo, useState } from "react";
import type { OlympiadProblemV2, OlympiadTaskAttempt, OlympiadStepResult } from "@/types/olympiad";
import { LEVEL_SPECS } from "@/types/olympiad";
import { extractNumbers, computeAttemptStatus } from "@/lib/olympiad-progress";

type Field = { id: string; q: string; formula?: string; answer: number | string };

export function AssumptionRunner({
  problem,
  onComplete,
}: {
  problem: OlympiadProblemV2;
  onComplete?: (attempt: OlympiadTaskAttempt) => void;
}) {
  const spec = LEVEL_SPECS[problem.level];
  const t = problem.assumption!;
  const lvl = problem.level;
  const legUnit = t.legUnit ?? "ног";
  const headUnit = t.headUnit ?? "голов";

  // ── вычисления (эталон) ──
  const [p0, p1] = t.participants;
  const small = p0.legs <= p1.legs ? p0 : p1;
  const big = small === p0 ? p1 : p0;
  const trial = t.totalHeads * small.legs;
  const gap = t.totalLegs - trial;
  const delta = big.legs - small.legs;
  const bigCount = delta !== 0 ? gap / delta : 0;
  const smallCount = t.totalHeads - bigCount;
  const cl = (p: typeof p0) => p.countLabel ?? p.label;
  const answer = `${bigCount} ${cl(big)} и ${smallCount} ${cl(small)}`;

  const showFormulas = lvl === "L1";
  const wordingCards = lvl === "L3" || lvl === "L4";
  const oneWindow = lvl === "L4";
  const worksheet = lvl === "L5" || spec.reasoningMode === "worksheet";

  // ── поля расчёта (одна точка истины) ──
  const dataFields: Field[] = [
    { id: "legSmall", q: `Сколько ${legUnit} у одного: ${small.label}?`, answer: small.legs },
    { id: "legBig", q: `Сколько ${legUnit} у одного: ${big.label}?`, answer: big.legs },
    { id: "heads", q: `Сколько всего животных (${headUnit}) по условию?`, answer: t.totalHeads },
    { id: "legs", q: `Сколько всего ${legUnit} по условию?`, answer: t.totalLegs },
  ];
  const trialFields: Field[] = [
    { id: "trial", q: `Если бы все ${t.totalHeads} были «${small.label}» (по ${small.legs}), сколько ${legUnit}?`, formula: `${t.totalHeads} × ${small.legs} =`, answer: trial },
  ];
  const compareFields: Field[] = [
    { id: "gap", q: `На сколько ${legUnit} не хватает до ${t.totalLegs}?`, formula: `${t.totalLegs} − ${trial} =`, answer: gap },
    { id: "delta", q: `На сколько ${legUnit} больше у «${big.label}», чем у «${small.label}»?`, formula: `${big.legs} − ${small.legs} =`, answer: delta },
    { id: "big", q: `Сколько тогда «${big.label}»?`, formula: `${gap} ÷ ${delta} =`, answer: bigCount },
    { id: "small", q: `Сколько тогда «${small.label}»?`, formula: `${t.totalHeads} − ${bigCount} =`, answer: smallCount },
  ];

  // ── экраны ──
  type Screen =
    | { id: string; type: "read" }
    | { id: string; type: "participants" }
    | { id: string; type: "fields"; title: string; instruction: string; fields: Field[] }
    | { id: string; type: "assemble" };

  const screens: Screen[] = useMemo(() => {
    if (worksheet) return [{ id: "read", type: "read" }, { id: "sheet", type: "assemble" }];
    if (oneWindow)
      return [
        { id: "read", type: "read" },
        { id: "all", type: "fields", title: "Реши задачу", instruction: "Заполни весь расчёт сам.", fields: [...dataFields, ...trialFields, ...compareFields] },
        { id: "assemble", type: "assemble" },
      ];
    return [
      { id: "read", type: "read" },
      { id: "participants", type: "participants" },
      { id: "data", type: "fields", title: "Данные задачи", instruction: "Сколько ног у каждого и сколько всего — перенеси из условия.", fields: dataFields },
      { id: "trial", type: "fields", title: "Пробный расчёт", instruction: "Представь, что все одного вида (у кого ног меньше).", fields: trialFields },
      { id: "compare", type: "fields", title: "Сравнение и замена", instruction: "Найди разницу, шаг замены и количества.", fields: compareFields },
      { id: "assemble", type: "assemble" },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvl]);

  // ── состояние ──
  const [idx, setIdx] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [scWrong, setScWrong] = useState(false);
  const [scAttempts, setScAttempts] = useState<Record<string, number>>({});
  const [hadError, setHadError] = useState<Record<string, boolean>>({});
  const [hintUsed, setHintUsed] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  // assemble
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [doneAttempt, setDoneAttempt] = useState<OlympiadTaskAttempt | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const screen = screens[idx];
  const setVal = (id: string, v: string) => setVals((m) => ({ ...m, [id]: v }));

  function checkField(f: Field): boolean {
    const v = vals[f.id] ?? "";
    if (typeof f.answer === "number") {
      const nums = extractNumbers(v);
      return nums.length > 0 && Math.abs(nums[nums.length - 1] - f.answer) < 1e-9;
    }
    return v.trim().toLowerCase() === String(f.answer).trim().toLowerCase();
  }

  function checkScreenFields(fields: Field[]) {
    let allOk = true;
    const he = { ...hadError };
    for (const f of fields) {
      const ok = checkField(f);
      if (!ok) { allOk = false; he[f.id] = true; }
    }
    setHadError(he);
    setScAttempts((m) => ({ ...m, [screen.id]: (m[screen.id] ?? 0) + 1 }));
    if (allOk) { setScWrong(false); next(); }
    else setScWrong(true);
  }

  function next() {
    setScWrong(false);
    if (idx < screens.length - 1) setIdx((i) => i + 1);
  }

  // ── СБОРКА РЕШЕНИЯ СЛОВАМИ (конспект) ──
  const conspect: { text: string; slot?: string; accept?: string }[] = [
    { text: "Представим, что все " }, { text: `${t.totalHeads}`, slot: "c_heads", accept: `${t.totalHeads}` },
    { text: " животных были " }, { text: cl(small), slot: "c_kind", accept: small.key },
    { text: ". Тогда " + legUnit + " было бы " }, { text: `${t.totalHeads} × ${small.legs} = ${trial}`, slot: "c_trial", accept: `${trial}` },
    { text: `. По условию ${legUnit} ` }, { text: `${t.totalLegs}`, slot: "c_legs", accept: `${t.totalLegs}` },
    { text: ". Не хватает " }, { text: `${t.totalLegs} − ${trial} = ${gap}`, slot: "c_gap", accept: `${gap}` },
    { text: ` ${legUnit}. Один «${big.label}» добавляет ` }, { text: `${big.legs} − ${small.legs} = ${delta}`, slot: "c_delta", accept: `${delta}` },
    { text: ` ${legUnit}. Значит, «${big.label}» было ` }, { text: `${gap} ÷ ${delta} = ${bigCount}`, slot: "c_big", accept: `${bigCount}` },
    { text: `. «${small.label}» было ` }, { text: `${t.totalHeads} − ${bigCount} = ${smallCount}`, slot: "c_small", accept: `${smallCount}` },
    { text: ". Ответ: " }, { text: answer, slot: "c_ans", accept: "ans" },
    { text: "." },
  ];
  const conspectSlots = conspect.filter((s) => s.slot) as { text: string; slot: string; accept: string }[];

  function assembleAllFilled() {
    return conspectSlots.every((s) => (slots[s.slot] ?? "") === s.accept);
  }

  function finish(correct: boolean, exhausted: boolean) {
    const totalScreenAttempts = Object.values(scAttempts).reduce((a, b) => a + b, 0);
    const anyErr = Object.values(hadError).some(Boolean);
    const steps: OlympiadStepResult[] = [
      ...dataFields, ...trialFields, ...compareFields,
    ].map((f) => ({
      stepId: f.id, value: vals[f.id] ?? "", attempts: 1,
      hintUsed, hadError: !!hadError[f.id], correct: checkField(f),
    }));
    const rec = {
      selectedData: `${headUnit}: ${t.totalHeads}, ${legUnit}: ${t.totalLegs}; ${small.label} — ${small.legs}, ${big.label} — ${big.legs}`,
      solutionPlan: "Предположить, что все одного вида → сравнить → шаг замены → количества.",
      solutionSteps: `${t.totalHeads}×${small.legs}=${trial}; ${t.totalLegs}−${trial}=${gap}; ${big.legs}−${small.legs}=${delta}; ${gap}÷${delta}=${bigCount}; ${t.totalHeads}−${bigCount}=${smallCount}`,
      reasoningText: worksheet ? "" : "Метод предположения: все одного вида, затем замена.",
      finalAnswer: answer,
    };
    const reasoningCompleteness = worksheet ? ("notChecked" as const) : ("complete" as const);
    const status = computeAttemptStatus({
      level: lvl, finalAnswerCorrect: correct, attemptsExhausted: exhausted,
      hintsUsed: hintUsed ? 1 : 0, anyStepError: anyErr, reasoningCompleteness,
    });
    const attempt: OlympiadTaskAttempt = {
      problemId: problem.id, themeId: problem.themeId, level: lvl,
      recordingFormat: spec.recordingFormat, ...rec, steps,
      hintsUsed: hintUsed ? 1 : 0, attempts: Math.max(totalScreenAttempts, 1),
      errorCodes: anyErr ? ["wrong_field"] : [], selfCorrection: anyErr && correct && !hintUsed,
      reasoningCompleteness, status, finalAnswerCorrect: correct,
      uploadedSolutionUrls: worksheet ? photos : undefined,
      rewardStars: status === "failed" ? 0 : problem.rewardStars,
    };
    setDoneAttempt(attempt);
    onComplete?.(attempt);
  }

  // ── РЕНДЕР ──
  if (doneAttempt) return <Result attempt={doneAttempt} breakdown={problem.breakdown} show={showBreakdown} onShow={() => setShowBreakdown(true)} />;

  return (
    <div className="olr">
      <div className="olr-statement">
        <div className="olr-levelbadge" title={spec.tagline}>{lvl}</div>
        <h1>{problem.title}</h1>
        <p>{problem.statement}</p>
      </div>

      <div className="olr-stepmeta">Шаг {idx + 1} из {screens.length}</div>

      {screen.type === "read" && (
        <div className="olr-step">
          <h3>Прочитай задачу</h3>
          <p className="olr-guidance">Прочитай условие внимательно. Когда будешь готов — начинаем решать по шагам.</p>
          <div className="olr-step-actions"><button className="olr-cta" onClick={next}>Понятно →</button></div>
        </div>
      )}

      {screen.type === "participants" && (
        <div className="olr-step">
          <h3>Кто участвует в задаче?</h3>
          <p className="olr-guidance">Нажми на карточки тех, о ком идёт речь в условии.</p>
          <div className="olr-chips">
            {[p0, p1, { key: "fish", label: "рыбы", icon: "🐟", legs: 0 }, { key: "people", label: "люди", icon: "🧒", legs: 2 }]
              .sort((a, b) => a.key.localeCompare(b.key))
              .map((p) => {
                const chosen = (slots[`pp_${p.key}`] ?? "") === "1";
                const real = p.key === p0.key || p.key === p1.key;
                return (
                  <button key={p.key} className={`olr-chip ${chosen ? "on" : ""}`} onClick={() => setSlots((m) => ({ ...m, [`pp_${p.key}`]: chosen ? "" : "1" }))}>
                    {p.icon} {p.label}{real ? "" : ""}
                  </button>
                );
              })}
          </div>
          {scWrong && <div className="olr-feedback wrong">Выбери ровно тех, кто есть в условии.</div>}
          <div className="olr-step-actions">
            <button className="olr-cta" onClick={() => {
              const ok = (slots[`pp_${p0.key}`] === "1") && (slots[`pp_${p1.key}`] === "1") && (slots["pp_fish"] !== "1") && (slots["pp_people"] !== "1");
              if (ok) next(); else setScWrong(true);
            }}>Проверить →</button>
          </div>
        </div>
      )}

      {screen.type === "fields" && (
        <div className="olr-step">
          <h3>{screen.title}</h3>
          <p className="olr-guidance">{screen.instruction}</p>
          <table className="olr-qtable">
            <tbody>
              {screen.fields.map((f) => (
                <tr key={f.id}>
                  <td className="olr-q">{f.q}{showFormulas && f.formula && <span className="olr-formula"> {f.formula}</span>}</td>
                  <td className="olr-a">
                    <input className="olr-input sm" value={vals[f.id] ?? ""} placeholder="?" onChange={(e) => setVal(f.id, e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scWrong && (
            <div className="olr-feedback wrong">
              Не всё верно — проверь подсвеченные.
              {problem.hints.length > 0 && (hintUsed ? <div className="olr-hint">💡 {problem.hints[0]}</div> : <button className="olr-hint-btn" onClick={() => setHintUsed(true)}>💡 Подсказка</button>)}
            </div>
          )}
          <div className="olr-step-actions">
            <button className="olr-cta" disabled={screen.fields.some((f) => !(vals[f.id] ?? "").trim())} onClick={() => checkScreenFields(screen.fields)}>Проверить →</button>
          </div>
        </div>
      )}

      {screen.type === "assemble" && worksheet && (
        <div className="olr-answer">
          <h2>Реши на листочке</h2>
          <p className="olr-muted">Запиши полное решение на бумаге, сфотографируй (до 3 фото) и впиши ответ.</p>
          <Photos photos={photos} onChange={setPhotos} />
          <label className="olr-fieldlabel">Ответ</label>
          <input className="olr-input olr-answer-input" value={vals.ans ?? ""} placeholder="Твой ответ…" onChange={(e) => setVal("ans", e.target.value)} />
          <button className="olr-cta" disabled={!(vals.ans ?? "").trim() || photos.length === 0} onClick={() => {
            const ok = (vals.ans ?? "").replace(/\s+/g, " ").trim().toLowerCase().includes(`${bigCount}`) && (vals.ans ?? "").includes(`${smallCount}`);
            finish(ok, false);
          }}>Отправить решение</button>
        </div>
      )}

      {screen.type === "assemble" && !worksheet && (
        <div className="olr-step">
          <h3>Запиши решение словами</h3>
          <p className="olr-guidance">Нажми на пропуск ___, затем на карточку. Собери полный текст решения.</p>
          <p className="tpl-body">
            {conspect.map((seg, i) => {
              if (!seg.slot) return <span key={i}>{seg.text}</span>;
              const filled = slots[seg.slot];
              const label = filled ? (seg.slot === "c_kind" ? cl(small) : seg.slot === "c_ans" ? answer : seg.text) : "___";
              return (
                <button key={i} className={`tpl-blank-btn ${activeSlot === seg.slot ? "active" : ""} ${filled ? "filled" : ""}`}
                  onClick={() => setActiveSlot(seg.slot!)}>
                  {label}{filled && <i className="tpl-x" onClick={(e) => { e.stopPropagation(); setSlots((m) => ({ ...m, [seg.slot!]: "" })); }}>×</i>}
                </button>
              );
            })}
          </p>
          <div className="tpl-pool">
            {conspectSlots.map((s) => ({ key: s.slot, accept: s.accept, label: s.slot === "c_kind" ? cl(small) : s.slot === "c_ans" ? answer : s.text }))
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((c) => {
                const used = Object.entries(slots).some(([sl, v]) => v === c.accept && conspectSlots.find((cs) => cs.slot === sl));
                return (
                  <button key={c.key} className="tpl-card" disabled={used}
                    onClick={() => { if (activeSlot) { setSlots((m) => ({ ...m, [activeSlot]: c.accept })); setActiveSlot(null); } }}>
                    {c.label}
                  </button>
                );
              })}
          </div>
          {scWrong && <div className="olr-feedback wrong">Пока не сходится — проверь расстановку.</div>}
          <div className="olr-step-actions">
            <button className="olr-cta" disabled={!assembleAllFilled()} onClick={() => finish(true, false)}>Готово →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Photos({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  return (
    <div className="olr-photos">
      {photos.map((name, i) => (
        <div key={i} className="olr-photo-item">📷 {name}
          <button className="olr-photo-del" onClick={() => onChange(photos.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      {photos.length < 3 && (
        <label className="olr-upload">
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange([...photos, f.name]); e.currentTarget.value = ""; }} />
          <span>📷 Добавить фото ({photos.length}/3)</span>
        </label>
      )}
    </div>
  );
}

function Result({ attempt, breakdown, show, onShow }: { attempt: OlympiadTaskAttempt; breakdown?: OlympiadProblemV2["breakdown"]; show: boolean; onShow: () => void }) {
  return (
    <div className={`olr olr-result ${attempt.status}`}>
      {attempt.status === "completed" && (<><b>Верно и чисто! 🎉 +{attempt.rewardStars} ★</b><span>Ты сам прошёл весь метод и записал решение. Отлично!</span></>)}
      {attempt.status === "completed_with_hint" && (<><b>Верно! 👍 +{attempt.rewardStars} ★</b><span>Были подсказки или ошибки — серия «без ошибок» начинается заново.</span></>)}
      {attempt.status === "needs_reasoning_revision" && (<><b>Почти! Допиши решение ✍️</b></>)}
      {attempt.status === "pendingReview" && (<><b>Отправлено методисту 📨</b><span>Листок на проверке. Автосверка ответа — лишь подсказка.</span></>)}
      {attempt.status === "failed" && (<><b>Пока не получилось</b><span>Посмотри разбор — задача попадёт в доработки.</span></>)}
      {breakdown && (show ? (
        <div className="olr-breakdown">
          <h3>Разбор</h3>
          <div className="olr-bd-row"><b>Что известно:</b> {breakdown.known}</div>
          <div className="olr-bd-row"><b>Идея:</b> {breakdown.idea}</div>
          <div className="olr-bd-row"><b>Шаги:</b><ol>{breakdown.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
          <div className="olr-bd-row"><b>Запись:</b> {breakdown.writtenSolution}</div>
          <div className="olr-bd-row"><b>Ответ:</b> {breakdown.answer}</div>
          <div className="olr-bd-row"><b>Проверь себя:</b> {breakdown.selfCheck}</div>
        </div>
      ) : (
        <button className="olr-cta ghost" onClick={onShow}>📖 Посмотреть разбор</button>
      ))}
    </div>
  );
}
