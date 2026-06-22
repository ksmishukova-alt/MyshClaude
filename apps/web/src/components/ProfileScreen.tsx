"use client";

/**
 * Профиль ребёнка — витрина «Я и мой маскот» (активный флоу):
 *  - крупный маскот с надетыми нарядами (наряды — CSS-оверлеи поверх avatar.png);
 *  - лавка/примерочная: купить за звёзды → надеть, маскот меняется визуально;
 *  - баланс звёзд; прогресс по темам/стадиям; смена своего PIN.
 *
 * Состояние гардероба и потраченные звёзды хранятся в localStorage по childId.
 * SEAM ДЛЯ БД: заменить load/save на чтение/запись child_profiles.mascot (jsonb) и stars.
 */

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { PetCompanion } from "./PetCompanion";

type Slot = "hat" | "eyes" | "neck" | "color";
interface Item { id: string; slot: Slot; name: string; emoji?: string; cost: number; hue?: number; swatch?: string }

const ITEMS: Item[] = [
  // головные уборы
  { id: "cap", slot: "hat", name: "Кепка", emoji: "🧢", cost: 0 },
  { id: "grad", slot: "hat", name: "Шапочка выпускника", emoji: "🎓", cost: 60 },
  { id: "crown", slot: "hat", name: "Корона", emoji: "👑", cost: 150 },
  { id: "tophat", slot: "hat", name: "Цилиндр", emoji: "🎩", cost: 90 },
  // очки
  { id: "sun", slot: "eyes", name: "Очки", emoji: "🕶️", cost: 40 },
  { id: "glass", slot: "eyes", name: "Очки-умника", emoji: "👓", cost: 35 },
  // на шею
  { id: "scarf", slot: "neck", name: "Шарф", emoji: "🧣", cost: 30 },
  { id: "bow", slot: "neck", name: "Бабочка", emoji: "🎀", cost: 25 },
  { id: "medal", slot: "neck", name: "Медаль", emoji: "🥇", cost: 120 },
  // цвет толстовки
  { id: "blue", slot: "color", name: "Синяя", cost: 0, hue: 0, swatch: "#2f7ad6" },
  { id: "green", slot: "color", name: "Зелёная", cost: 70, hue: 95, swatch: "#3fae5a" },
  { id: "pink", slot: "color", name: "Розовая", cost: 70, hue: -70, swatch: "#ec5f9e" },
  { id: "purple", slot: "color", name: "Фиолетовая", cost: 70, hue: 150, swatch: "#8b5cf6" },
];
const SLOT_TITLE: Record<Slot, string> = { hat: "Головные уборы", eyes: "Очки", neck: "На шею", color: "Цвет толстовки" };
const SLOTS: Slot[] = ["hat", "eyes", "neck", "color"];
const cssVars = (o: Record<string, string | number>) => o as unknown as CSSProperties;

export interface ThemeRow { id: string; title: string; icon: string; stage: string; color: string; badge: boolean }

export function ProfileScreen({
  childId, name, grade, baseStars, themes, petXp,
}: {
  childId: string; name: string; grade: number; baseStars: number; themes: ThemeRow[]; petXp: number;
}) {
  const key = `mysh_mascot_${childId}`;
  const [mounted, setMounted] = useState(false);
  const [owned, setOwned] = useState<string[]>(["cap", "blue"]);
  const [equipped, setEquipped] = useState<Partial<Record<Slot, string>>>({ color: "blue" });
  const [spent, setSpent] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.owned)) setOwned(s.owned);
        if (s.equipped) setEquipped(s.equipped);
        if (typeof s.spent === "number") setSpent(s.spent);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(key, JSON.stringify({ owned, equipped, spent })); } catch { /* ignore */ }
  }, [owned, equipped, spent, mounted, key]);

  const stars = baseStars - spent;
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  function onItem(it: Item) {
    if (!owned.includes(it.id)) {
      if (stars < it.cost) { flash("Не хватает звёзд ⭐"); return; }
      setOwned((o) => [...o, it.id]);
      setSpent((s) => s + it.cost);
      setEquipped((e) => ({ ...e, [it.slot]: it.id }));
      flash(`Куплено: ${it.name}!`);
      return;
    }
    // владеет → надеть/снять (цвет всегда надет)
    setEquipped((e) => {
      const cur = e[it.slot];
      if (it.slot === "color") return { ...e, color: it.id };
      return { ...e, [it.slot]: cur === it.id ? undefined : it.id };
    });
  }

  const colorItem = ITEMS.find((i) => i.id === equipped.color);
  const hue = colorItem?.hue ?? 0;
  const wornBy = (slot: Slot) => ITEMS.find((i) => i.id === equipped[slot]);

  return (
    <main className="pf-stage" aria-label="Профиль">
      <div className="pf-wrap">
        <header className="pf-top">
          <Link className="pf-back" href="/">← На главную</Link>
          <span className="pf-stars">⭐ {mounted ? stars : baseStars}</span>
        </header>

        {/* Витрина маскота */}
        <section className="pf-hero">
          <div className="pf-mascot">
            <div className="pf-mascot-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pf-mascot-img" src="/myshmat-assets/avatar.png" alt="Маскот" style={cssVars({ filter: hue ? `hue-rotate(${hue}deg)` : "none" })} />
            {wornBy("hat") && <span className="pf-wear hat">{wornBy("hat")!.emoji}</span>}
            {wornBy("eyes") && <span className="pf-wear eyes">{wornBy("eyes")!.emoji}</span>}
            {wornBy("neck") && <span className="pf-wear neck">{wornBy("neck")!.emoji}</span>}
          </div>
          <div className="pf-id">
            <h1>{name}</h1>
            <span className="pf-class">{grade} класс</span>
          </div>
        </section>

        {/* Питомец-тамагочи */}
        <PetCompanion childId={childId} petXp={petXp} />

        {/* Гардероб / лавка */}
        <section className="pf-card">
          <h2>👕 Мой маскот — лавка нарядов</h2>
          <p className="pf-hint">Покупай за звёзды и наряжай маскота. Нажми «надетое», чтобы снять.</p>
          {SLOTS.map((slot) => (
            <div key={slot} className="pf-slot">
              <h3>{SLOT_TITLE[slot]}</h3>
              <div className="pf-items">
                {ITEMS.filter((i) => i.slot === slot).map((it) => {
                  const has = mounted && owned.includes(it.id);
                  const on = mounted && equipped[it.slot] === it.id;
                  return (
                    <button key={it.id} className={`pf-item ${on ? "on" : ""} ${has ? "owned" : ""}`} onClick={() => onItem(it)}>
                      <span className="pf-item-prev">
                        {it.swatch ? <span className="pf-swatch" style={cssVars({ background: it.swatch })} /> : it.emoji}
                      </span>
                      <span className="pf-item-name">{it.name}</span>
                      <span className="pf-item-tag">{on ? "✓ Надето" : has ? "Надеть" : `⭐ ${it.cost}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Прогресс по темам */}
        <section className="pf-card">
          <h2>🗺️ Мой прогресс</h2>
          <p className="pf-hint">Стадии по темам олимпиадной математики. Значок — тема приручена.</p>
          <div className="pf-themes">
            {themes.map((t) => (
              <Link key={t.id} href={`/topics/${t.id}`} className="pf-theme">
                <span className="pf-theme-ic">{t.icon}</span>
                <span className="pf-theme-name">{t.title}</span>
                <span className={`pf-theme-stage ${t.color}`}>{t.stage}</span>
                {t.badge && <span className="pf-theme-badge" title="Тема освоена">🏅</span>}
              </Link>
            ))}
          </div>
          <div className="pf-links">
            <Link href="/rewards" className="pf-link">🏆 Награды</Link>
            <Link href="/stickers" className="pf-link">🌟 Наклейки</Link>
            <Link href="/topics" className="pf-link">🗺️ Карта тем</Link>
          </div>
        </section>

        {/* Настройки: смена PIN */}
        <ChangePin />

        {toast && <div className="pf-toast">{toast}</div>}
      </div>
    </main>
  );
}

function ChangePin() {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function save() {
    if (!/^\d{4}$/.test(pin)) { setStatus("err"); setMsg("PIN — это 4 цифры"); return; }
    if (pin !== pin2) { setStatus("err"); setMsg("Повтор не совпадает"); return; }
    setStatus("saving");
    try {
      const res = await fetch("/api/profile/set-pin", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
      });
      const d = await res.json().catch(() => ({ ok: false }));
      if (d.ok) { setStatus("ok"); setMsg("PIN изменён ✓"); setPin(""); setPin2(""); }
      else { setStatus("err"); setMsg(d.reason === "no-db" ? "Сменить PIN можно только на боевой версии" : "Не получилось сохранить"); }
    } catch { setStatus("err"); setMsg("Ошибка сети"); }
  }

  return (
    <section className="pf-card">
      <h2>🔒 Мой PIN-код</h2>
      <p className="pf-hint">Это твой код для входа. Придумай новый из 4 цифр.</p>
      <div className="pf-pinrow">
        <input className="pf-pininput" inputMode="numeric" maxLength={4} value={pin} placeholder="Новый PIN" onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        <input className="pf-pininput" inputMode="numeric" maxLength={4} value={pin2} placeholder="Повтори" onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        <button className="pf-save" disabled={status === "saving"} onClick={save}>{status === "saving" ? "Сохраняю…" : "Сменить"}</button>
      </div>
      {msg && <div className={`pf-pinmsg ${status}`}>{msg}</div>}
    </section>
  );
}
