"use client";

import { useState } from "react";
import Link from "next/link";
import "./chests.css";

interface ChestItem {
  id: string;
  tier: "basic" | "silver" | "gold" | "secret";
  title: string;
  reward: string;
}

const CHESTS: ChestItem[] = [
  { id: "c1", tier: "basic", title: "Бронзовый сундук", reward: "+15 ⭐ и наклейка" },
  { id: "c2", tier: "silver", title: "Серебряный сундук", reward: "+30 ⭐ и редкая наклейка" },
  { id: "c3", tier: "gold", title: "Золотой сундук", reward: "+50 ⭐ и особая награда" },
  { id: "c4", tier: "secret", title: "Секретный сундук", reward: "Сюрприз! 🎁" },
];

const TIER_EMOJI: Record<string, string> = {
  basic: "🎁", silver: "🥈", gold: "🏆", secret: "✨",
};

export default function ChestsPage() {
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  return (
    <main className="ch-stage" aria-label="Сундуки">
      <div className="ch-wrap">
        <header className="ch-top">
          <Link className="ch-back" href="/">← На главную</Link>
          <h1>Сундуки</h1>
        </header>
        <p className="ch-intro">Открывай сундуки и получай звёзды и наклейки! Нажми на сундук 🗝️</p>
        <div className="ch-grid">
          {CHESTS.map((c) => {
            const isOpen = opened[c.id];
            return (
              <button
                key={c.id}
                className={`ch-card ch-${c.tier}${isOpen ? " open" : ""}`}
                onClick={() => setOpened((o) => ({ ...o, [c.id]: true }))}
                disabled={isOpen}
              >
                <div className="ch-emoji">{isOpen ? "🎉" : TIER_EMOJI[c.tier]}</div>
                <div className="ch-title">{c.title}</div>
                {isOpen ? (
                  <div className="ch-reward">{c.reward}</div>
                ) : (
                  <div className="ch-hint">Нажми, чтобы открыть</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
