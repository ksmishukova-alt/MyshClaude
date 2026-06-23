"use client";

/**
 * «Мой питомец» — тамагочи с лёгкой заботой.
 *  - на старте ребёнок выбирает питомца (первый — бесплатно, ещё — за звёзды);
 *  - питомец растёт от решения задач: РАЗМЕР и СВЕЧЕНИЕ усиливаются со стадией
 *    (без аксессуаров и лишних подписей);
 *  - лёгкая забота: доброе настроение + «погладить» (только позитив, без угасания);
 *  - празднование роста/эволюции при возвращении после новых успехов.
 *
 * Состояние — в localStorage по childId. SEAM ДЛЯ БД: child_profiles.pet (jsonb).
 */

import { useEffect, useRef, useState } from "react";
import { PET_SPECIES, getSpecies, stageFor } from "@/lib/pet";
import { PetView } from "./PetView";

const PET_COST = 100; // цена второго и последующих питомцев

interface PetState {
  speciesId?: string;
  name?: string;
  owned?: string[];
  lastVisit?: number;
  lastXp?: number;
}

export function PetCompanion({
  childId, petXp, stars, buy,
}: {
  childId: string; petXp: number; stars: number; buy: (cost: number) => boolean;
}) {
  const key = `mysh_pet_${childId}`;
  const [mounted, setMounted] = useState(false);
  const [pet, setPet] = useState<PetState>({});
  const [mood, setMood] = useState("");
  const [celebrate, setCelebrate] = useState<"grow" | "evolve" | null>(null);
  const [pat, setPat] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const patTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setPet({ ...p, lastVisit: Date.now(), lastXp: petXp });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, JSON.stringify(pet));
    } catch {
      /* ignore */
    }
  }, [pet, mounted, key]);

  function choose(id: string) {
    const owned = pet.owned ?? [];
    const isOwned = owned.includes(id);
    if (!isOwned) {
      if (owned.length > 0 && !buy(PET_COST)) return; // первый бесплатно, далее за звёзды
    }
    const sp = getSpecies(id);
    setPet((p) => ({
      ...p,
      speciesId: id,
      name: p.speciesId ? p.name : sp.name, // имя сохраняем при смене вида
      owned: isOwned ? owned : [...owned, id],
      lastVisit: Date.now(),
      lastXp: petXp,
    }));
    setChoosing(false);
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
  if (!pet.speciesId || choosing) {
    const owned = pet.owned ?? [];
    const firstFree = owned.length === 0;
    return (
      <section className="pf-card pet-card">
        <h2>🐣 {firstFree ? "Выбери питомца" : "Сменить питомца"}</h2>
        <p className="pf-hint">
          {firstFree
            ? "Он будет расти и радоваться, когда ты решаешь задачи. Первый питомец — бесплатно!"
            : `Свои питомцы — бесплатно. Новый стоит ⭐${PET_COST}.`}
        </p>
        <div className="pet-choose">
          {PET_SPECIES.map((s) => {
            const isOwned = owned.includes(s.id);
            const price = !isOwned && !firstFree ? PET_COST : 0;
            return (
              <button key={s.id} className="pet-choice" onClick={() => choose(s.id)} style={{ ["--pet-accent" as string]: s.accent }}>
                <span className="pet-choice-face">{s.emoji}</span>
                <span className="pet-choice-name">{s.name}</span>
                <span className="pet-choice-blurb">{s.blurb}</span>
                <span className="pet-choice-tag">{isOwned ? "✓ твой" : price ? `⭐ ${price}` : "Бесплатно"}</span>
              </button>
            );
          })}
        </div>
        {!firstFree && <button className="pet-cancel" onClick={() => setChoosing(false)}>Отмена</button>}
      </section>
    );
  }

  // ── Витрина питомца ──
  const sp = getSpecies(pet.speciesId);
  const cur = stageFor(petXp);

  return (
    <section className="pf-card pet-card" style={{ ["--pet-accent" as string]: sp.accent }}>
      <h2>🐾 Мой питомец</h2>

      <div className="pet-stage-wrap">
        <div className={`pet-hero${pat ? " patted" : ""}`} onClick={petTheCompanion} title="Погладить">
          <PetView speciesId={pet.speciesId} stageId={cur.id} size={150} />
          {pat && <span className="pet-heart">💛</span>}
          {celebrate && <span className={`pet-cele ${celebrate}`}>{celebrate === "evolve" ? "✨ Подрос!" : "🎉 +рост"}</span>}
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

          <p className="pet-mood">{mood}</p>
          <p className="pet-grow">Растёт, когда ты решаешь задачи 🌱</p>

          <div className="pet-actions">
            <button className="pet-pat-btn" onClick={petTheCompanion}>🤚 Погладить</button>
            <button className="pet-swap-btn" onClick={() => setChoosing(true)}>Сменить</button>
          </div>
        </div>
      </div>
    </section>
  );
}
