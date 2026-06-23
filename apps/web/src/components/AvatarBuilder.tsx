"use client";

/**
 * Конструктор аватара «Собери себя» (DiceBear Avataaars).
 *  - живое превью (картинка по URL, без ассетов);
 *  - выбор пола (пресет причёски) + причёска/одежда/глаза/рот/очки/цвета/фон;
 *  - база бесплатно, премиум-элементы открываются за звёзды (через buy из родителя).
 *
 * Конфиг и купленные премиум-элементы хранятся в localStorage по childId.
 * SEAM ДЛЯ БД: заменить load/save на child_profiles.avatar (jsonb).
 */

import { useEffect, useState } from "react";
import {
  buildAvatarUrl, DEFAULT_AVATAR, GENDER_PRESET,
  SKIN, HAIR, HAIR_COLOR, CLOTHING, CLOTHES_COLOR, EYES, MOUTH, ACCESSORY, BG,
  type AvatarConfig, type AvatarFeature, type Opt,
} from "@/lib/avatar";

export function AvatarBuilder({
  childId, name, grade, stars, buy,
}: {
  childId: string; name: string; grade: number; stars: number;
  /** списать звёзды; true — успех, false — не хватило */
  buy: (cost: number) => boolean;
}) {
  const key = `mysh_avatar_${childId}`;
  const [mounted, setMounted] = useState(false);
  const [cfg, setCfg] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [owned, setOwned] = useState<string[]>([]);
  const [gender, setGender] = useState<"boy" | "girl">("boy");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.cfg) setCfg({ ...DEFAULT_AVATAR, ...s.cfg });
        if (Array.isArray(s.owned)) setOwned(s.owned);
        if (s.gender === "boy" || s.gender === "girl") setGender(s.gender);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, JSON.stringify({ cfg, owned, gender }));
    } catch {
      /* ignore */
    }
  }, [cfg, owned, gender, mounted, key]);

  const oid = (f: AvatarFeature, v: string) => `${f}:${v}`;

  function pick(feature: AvatarFeature, value: string, cost = 0) {
    if (cost > 0 && !owned.includes(oid(feature, value))) {
      if (!buy(cost)) return; // родитель покажет «не хватает звёзд»
      setOwned((o) => [...o, oid(feature, value)]);
    }
    setCfg((c) => ({ ...c, [feature]: value }));
  }

  function setGenderPreset(g: "boy" | "girl") {
    setGender(g);
    setCfg((c) => ({ ...c, ...GENDER_PRESET[g] }));
  }

  const previewCfg = mounted ? cfg : DEFAULT_AVATAR;

  return (
    <section className="pf-card av-card">
      <div className="av-head">
        <div className="av-preview-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="av-preview" src={buildAvatarUrl(previewCfg, 220)} alt="Мой аватар" />
        </div>
        <div className="av-id">
          <h1 className="av-name">{name}</h1>
          <span className="av-class">{grade} класс</span>
          <div className="av-gender">
            <button className={`av-gbtn ${gender === "boy" ? "on" : ""}`} onClick={() => setGenderPreset("boy")}>👦 Мальчик</button>
            <button className={`av-gbtn ${gender === "girl" ? "on" : ""}`} onClick={() => setGenderPreset("girl")}>👧 Девочка</button>
          </div>
        </div>
      </div>

      <h2 className="av-title">🎨 Собери себя</h2>
      <p className="pf-hint">Базовое — бесплатно. Особые причёски, одежда и очки открываются за звёзды ⭐.</p>

      <ColorRow title="Цвет кожи" colors={SKIN} active={cfg.skinColor} onPick={(v) => pick("skinColor", v)} mounted={mounted} />
      <OptRow title="Причёска" opts={HAIR} active={cfg.top} owned={owned} feature="top" onPick={pick} mounted={mounted} />
      <ColorRow title="Цвет волос" colors={HAIR_COLOR} active={cfg.hairColor} onPick={(v) => pick("hairColor", v)} mounted={mounted} />
      <OptRow title="Одежда" opts={CLOTHING} active={cfg.clothing} owned={owned} feature="clothing" onPick={pick} mounted={mounted} />
      <ColorRow title="Цвет одежды" colors={CLOTHES_COLOR} active={cfg.clothesColor} onPick={(v) => pick("clothesColor", v)} mounted={mounted} />
      <OptRow title="Глаза" opts={EYES} active={cfg.eyes} owned={owned} feature="eyes" onPick={pick} mounted={mounted} />
      <OptRow title="Рот" opts={MOUTH} active={cfg.mouth} owned={owned} feature="mouth" onPick={pick} mounted={mounted} />
      <OptRow title="Очки" opts={ACCESSORY} active={cfg.accessory} owned={owned} feature="accessory" onPick={pick} mounted={mounted} />
      <ColorRow title="Фон" colors={BG} active={cfg.bg} onPick={(v) => pick("bg", v)} mounted={mounted} />
    </section>
  );
}

function ColorRow({
  title, colors, active, onPick, mounted,
}: {
  title: string; colors: string[]; active: string; onPick: (v: string) => void; mounted: boolean;
}) {
  return (
    <div className="av-row">
      <h3 className="av-row-t">{title}</h3>
      <div className="av-swatches">
        {colors.map((c) => (
          <button
            key={c}
            className={`av-swatch ${mounted && active === c ? "on" : ""} ${c === "transparent" ? "tr" : ""}`}
            style={{ background: c === "transparent" ? "#fff" : `#${c}` }}
            onClick={() => onPick(c)}
            aria-label={title}
          />
        ))}
      </div>
    </div>
  );
}

function OptRow({
  title, opts, active, owned, feature, onPick, mounted,
}: {
  title: string; opts: Opt[]; active: string; owned: string[];
  feature: AvatarFeature; onPick: (f: AvatarFeature, v: string, cost?: number) => void; mounted: boolean;
}) {
  return (
    <div className="av-row">
      <h3 className="av-row-t">{title}</h3>
      <div className="av-chips">
        {opts.map((o) => {
          const locked = !!o.cost && !owned.includes(`${feature}:${o.value}`);
          const on = mounted && active === o.value;
          return (
            <button
              key={o.value}
              className={`av-chip ${on ? "on" : ""} ${locked ? "locked" : ""}`}
              onClick={() => onPick(feature, o.value, o.cost)}
            >
              {o.label}
              {locked && <span className="av-price">⭐{o.cost}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
