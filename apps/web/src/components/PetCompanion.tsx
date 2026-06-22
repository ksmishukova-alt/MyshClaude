"use client";

/**
 * «Мой питомец» — тамагочи с лёгкой заботой.
 *  - на старте ребёнок выбирает питомца из каталога;
 *  - питомец растёт (эволюция стадий) по мере решения олимпиадных задач (petXp);
 *  - лёгкая забота: доброе настроение + кнопка «погладить» (только позитив, без угасания);
 *  - празднование роста/эволюции при возвращении после новых успехов.
 *
 * Состояние (выбранный вид, имя, последний визит, последний учтённый xp) — в
 * localStorage по childId. SEAM ДЛЯ БД: заменить load/save на child_profiles.pet (jsonb).
 */

import { useEffect, useRef, useState } from "react";
import { PET_SPECIES, getSpecies, stageFor, nextStage, stageProgress } from "@/lib/pet";
import { PetView } from "./PetView";

interface PetState {
  speciesId?: string;
  name?: string;
  lastVisit?: number;
  lastXp?: number;
}

export function PetCompanion({ childId, petXp }: { childId: string; petXp: number }) {
  const key = `mysh_pet_${childId}`;
  const [mounted, setMounted] = useState(false);
  const [pet, setPet] = useState<PetState>({});
  const [mood, setMood] = useState("");
  const [celebrate, setCelebrate] = useState<"grow" | "evolve" | null>(null);
  const [pat, setPat] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const patTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузка + расчёт настроения и празднования за один проход на маунте.
  useEffect(() => {
    setMounted(true);
    let p: PetState = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) p = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    setPet(p);

    const days = p.lastVisit ? (Date.now() - p.lastVisit) / 86_400_000 : 0;
    setMood(
      days < 1 ? "Полон сил! 💪" : days < 2 ? "Рад тебя видеть! 😊" : days < 4 ? "Скучал по тебе 🥺" : "Так ждал тебя! 🤗",
    );

    if (p.speciesId) {
      const prevXp = p.lastXp ?? petXp;
      if (petXp > prevXp) {
        const evolved = stageFor(petXp).id !== stageFor(prevXp).id;
        setCelebrate(evolved ? "evolve" : "grow");
        setTimeout(() => setCelebrate(null), 2800);
      }
      // отметить визит и зафиксировать учтённый xp
      setPet({ ...p, lastVisit: Date.now(), lastXp: petXp });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Сохранение состояния.
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, JSON.stringify(pet));
    } catch {
      /* ignore */
    }
  }, [pet, mounted, key]);

  function choose(id: string) {
    const sp = getSpecies(id);
    setPet({ speciesId: id, name: sp.name, lastVisit: Date.now(), lastXp: petXp });
  }

  function petTheCompanion() {
    setPat(true);
    if (patTimer.current) clearTimeout(patTimer.current);
    patTimer.current = setTimeout(() => setPat(false), 900);
  }

  function saveName() {
    const n = nameDraft.trim().slice(0, 16);
    if (n) setPet((p) => ({ ...p, name: n }));
    setRenaming(false);
  }

  // ── Каркас (стабилен для SSR) ──
  if (!mounted) {
    return (
      <section className="pf-card pet-card">
        <h2>🐣 Мой питомец</h2>
        <div className="pet-skel" />
      </section>
    );
  }

  // ── Экран выбора питомца ──
  if (!pet.speciesId) {
    return (
      <section className="pf-card pet-card">
        <h2>🐣 Выбери питомца</h2>
        <p className="pf-hint">Он будет расти и радоваться, когда ты решаешь задачи. Выбери друга — это навсегда (ну, почти 😊).</p>
        <div className="pet-choose">
          {PET_SPECIES.map((s) => (
            <button key={s.id} className="pet-choice" onClick={() => choose(s.id)} style={{ ["--pet-accent" as string]: s.accent }}>
              <span className="pet-choice-face">{s.emoji}</span>
              <span className="pet-choice-name">{s.name}</span>
              <span className="pet-choice-blurb">{s.blurb}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ── Витрина питомца ──
  const sp = getSpecies(pet.speciesId);
  const cur = stageFor(petXp);
  const nxt = nextStage(petXp);
  const prog = stageProgress(petXp);

  return (
    <section className="pf-card pet-card" style={{ ["--pet-accent" as string]: sp.accent }}>
      <h2>🐾 Мой питомец</h2>

      <div className="pet-stage-wrap">
        <div className={`pet-hero${pat ? " patted" : ""}`} onClick={petTheCompanion} title="Погладить">
          <PetView speciesId={pet.speciesId} stageId={cur.id} size={150} />
          {pat && <span className="pet-heart">💛</span>}
          {celebrate && <span className={`pet-cele ${celebrate}`}>{celebrate === "evolve" ? "✨ Эволюция!" : "🎉 Подрос!"}</span>}
        </div>

        <div className="pet-meta">
          {renaming ? (
            <div className="pet-rename">
              <input
                className="pet-name-input"
                autoFocus
                maxLength={16}
                defaultValue={pet.name}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                placeholder="Имя питомца"
              />
              <button className="pet-name-save" onClick={saveName}>OK</button>
            </div>
          ) : (
            <h3 className="pet-name">
              {pet.name}
              <button className="pet-rename-btn" onClick={() => { setNameDraft(pet.name ?? ""); setRenaming(true); }} aria-label="Переименовать">✏️</button>
            </h3>
          )}

          <span className="pet-stage-badge">{cur.name}</span>
          <p className="pet-mood">{mood}</p>

          <div className="pet-bar" aria-label="Полоска роста">
            <span className="pet-bar-fill" style={{ width: `${Math.round(prog * 100)}%` }} />
          </div>
          <p className="pet-next">
            {nxt ? <>Реши ещё задачи — и {pet.name} станет «{nxt.name}»!</> : <>Максимальная стадия — настоящий Мастер! 🏆</>}
          </p>

          <button className="pet-pat-btn" onClick={petTheCompanion}>🤚 Погладить</button>
        </div>
      </div>

      <p className="pet-foot">Питомец растёт от решённых задач и освоенных тем. Он всегда тебе рад и никогда не грустит 💚</p>
    </section>
  );
}
