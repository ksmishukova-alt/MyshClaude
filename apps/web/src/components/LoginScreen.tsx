"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChildProfile } from "@/types/domain";

type Profile = ChildProfile & { shortCode: string };
type Phase = "idle" | "checking" | "ok";

export function LoginScreen({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  async function submitPin(nextPin: string) {
    if (!picked) return;
    setPhase("checking");
    setError(false);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pin", childId: picked.id, pin: nextPin }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        setPhase("ok");
        // показать «Готово!» и плавно перейти
        setTimeout(() => router.push("/"), 700);
        return;
      }
    } catch {
      /* ignore */
    }
    setError(true);
    setPin("");
    setPhase("idle");
  }

  function press(d: string) {
    if (phase !== "idle") return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submitPin(next);
  }

  function back() {
    setPicked(null);
    setPin("");
    setError(false);
    setPhase("idle");
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
              <span className="lg-avatar" aria-hidden />
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
      <button className="lg-back" onClick={back} disabled={phase !== "idle"}>← Назад</button>
      <div className={`lg-avatar big${phase === "ok" ? " ok" : ""}`} aria-hidden />
      <h1 className="lg-title">
        {phase === "ok" ? `С возвращением, ${picked.name}!` : `Привет, ${picked.name}!`}
      </h1>
      <p className="lg-sub">
        {phase === "checking" ? "Проверяю ПИН…" : phase === "ok" ? "Всё верно — заходим!" : "Введи свой ПИН-код"}
      </p>

      <div className={`lg-dots${error ? " err" : ""}${phase === "checking" ? " checking" : ""}${phase === "ok" ? " ok" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length || phase !== "idle" ? "on" : ""} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>

      {phase === "checking" ? (
        <div className="lg-status"><span className="lg-spinner" aria-hidden /> Проверяю…</div>
      ) : phase === "ok" ? (
        <div className="lg-status ok"><span className="lg-check" aria-hidden>✓</span> Готово!</div>
      ) : (
        <>
          {error && <div className="lg-err-text">Неверный ПИН, попробуй ещё раз</div>}
          <div className="lg-pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} className="lg-key" onClick={() => press(d)}>{d}</button>
            ))}
            <span />
            <button className="lg-key" onClick={() => press("0")}>0</button>
            <button className="lg-key del" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
          </div>
        </>
      )}
    </div>
  );
}
