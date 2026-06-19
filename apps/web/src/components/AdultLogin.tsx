"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdultLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"methodist" | "parent">("methodist");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        const next = params.get("next");
        router.push(next || (role === "parent" ? "/parent" : "/methodist"));
        return;
      }
    } catch {
      /* ignore */
    }
    setError(true);
    setBusy(false);
  }

  return (
    <div className="lg-box en-box">
      <h1 className="lg-title">Вход для взрослых</h1>
      <p className="lg-sub">Методист или родитель</p>

      <div className="en-roles">
        <button
          className={`en-role ${role === "methodist" ? "on" : ""}`}
          onClick={() => setRole("methodist")}
        >
          👩‍🏫 Методист
        </button>
        <button
          className={`en-role ${role === "parent" ? "on" : ""}`}
          onClick={() => setRole("parent")}
        >
          👨‍👩‍👧 Родитель
        </button>
      </div>

      <input
        className="en-input"
        type="password"
        value={password}
        placeholder="Пароль"
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && password) submit();
        }}
      />
      {error && <div className="lg-err-text">Неверный пароль</div>}

      <button className="en-submit" disabled={busy || !password} onClick={submit}>
        Войти
      </button>
      <a className="en-childlink" href="/login">Я ребёнок — войти по ПИН →</a>
    </div>
  );
}
