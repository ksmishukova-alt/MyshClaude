"use client";

/**
 * Кабинет ребёнка: «Я и мой питомец».
 *  - конструктор аватара (DiceBear) — ребёнок собирает себя сам;
 *  - питомец-тамагочи, растёт от решённых задач;
 *  - прогресс по темам/стадиям; смена своего PIN.
 *
 * Единый кошелёк звёзд: баланс = baseStars − потрачено. Покупки (премиум-элементы
 * аватара, новые питомцы) идут через buy() и копятся в localStorage по childId.
 * SEAM ДЛЯ БД: заменить кошелёк на child_profiles.stars_spent.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AvatarBuilder } from "./AvatarBuilder";
import { PetCompanion } from "./PetCompanion";

export interface ThemeRow { id: string; title: string; icon: string; stage: string; color: string; badge: boolean }

export function ProfileScreen({
  childId, name, grade, baseStars, themes, petXp,
}: {
  childId: string; name: string; grade: number; baseStars: number; themes: ThemeRow[]; petXp: number;
}) {
  const wkey = `mysh_wallet_${childId}`;
  const [mounted, setMounted] = useState(false);
  const [spent, setSpent] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(wkey);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.spent === "number") setSpent(s.spent);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(wkey, JSON.stringify({ spent }));
    } catch {
      /* ignore */
    }
  }, [spent, mounted, wkey]);

  const stars = baseStars - spent;
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  /** Списать звёзды. true — успех; false — не хватило. */
  function buy(cost: number): boolean {
    if (cost <= 0) return true;
    if (!mounted) return false;
    if (stars < cost) { flash("Не хватает звёзд ⭐"); return false; }
    setSpent((s) => s + cost);
    flash("Открыто! ⭐");
    return true;
  }

  return (
    <main className="pf-stage" aria-label="Профиль">
      <div className="pf-wrap">
        <header className="pf-top">
          <Link className="pf-back" href="/">← На главную</Link>
          <span className="pf-stars">⭐ {mounted ? stars : baseStars}</span>
        </header>

        {/* Конструктор аватара ребёнка */}
        <AvatarBuilder childId={childId} name={name} grade={grade} stars={stars} buy={buy} />

        {/* Питомец-тамагочи */}
        <PetCompanion childId={childId} petXp={petXp} stars={stars} buy={buy} />

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

        {/* Смена PIN */}
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
