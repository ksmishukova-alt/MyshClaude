"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChildProfile } from "@/types/domain";

type Profile = ChildProfile & { shortCode: string };

export function LoginScreen({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitPin(nextPin: string) {
    if (!picked) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pin", childId: picked.id, pin: nextPin }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        router.push("/");
        return;
      }
    } catch {
      /* ignore */
    }
    setError(true);
    setPin("");
    setBusy(false);
  }

  function press(d: string) {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  // ── выбор профиля ──
  if (!picked) {
    return (
      <div className="lg-box">
        <h1 className="lg-title">Кто заходит?</h1>
        <p className="lg-sub">Выбери себя</p>
        <div className="lg-profiles">
          {profiles.map((p) => (
            <button key={p.id} className="lg-profile" onClick={() => setPicked(p)}>
              <span className="lg-avatar">🐭</span>
              <span className="lg-name">{p.name}</span>
              <span className="lg-grade">{p.grade} класс</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── ввод PIN ──
  return (
    <div className="lg-box">
      <button className="lg-back" onClick={() => { setPicked(null); setPin(""); setError(false); }}>
        ← Назад
      </button>
      <div className="lg-avatar big">🐭</div>
      <h1 className="lg-title">Привет, {picked.name}!</h1>
      <p className="lg-sub">Введи свой ПИН-код</p>

      <div className={`lg-dots${error ? " err" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      {error && <div className="lg-err-text">Неверный ПИН, попробуй ещё раз</div>}

      <div className="lg-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} className="lg-key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button className="lg-key" onClick={() => press("0")}>0</button>
        <button className="lg-key del" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
      </div>
    </div>
  );
}
