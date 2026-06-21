"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import "./chests.css";

const cssVars = (o: Record<string, string | number>) => o as unknown as CSSProperties;

type Tier = "basic" | "silver" | "gold" | "secret";
interface RewardChip { icon: string; label: string; }
interface ChestItem {
  id: string;
  tier: Tier;
  title: string;
  status: "ready" | "locked";
  lockMsg?: string;
  rewards: RewardChip[];
}

const CHESTS: ChestItem[] = [
  { id: "c1", tier: "basic", title: "Бронзовый сундук", status: "ready",
    rewards: [{ icon: "⭐", label: "+15" }, { icon: "🦊", label: "наклейка" }] },
  { id: "c2", tier: "silver", title: "Серебряный сундук", status: "ready",
    rewards: [{ icon: "⭐", label: "+30" }, { icon: "💎", label: "редкая наклейка" }] },
  { id: "c3", tier: "gold", title: "Золотой сундук", status: "locked",
    lockMsg: "Реши 3 задачи, чтобы получить ключ", rewards: [{ icon: "⭐", label: "+50" }, { icon: "🏅", label: "значок" }] },
  { id: "c4", tier: "secret", title: "Секретный сундук", status: "locked",
    lockMsg: "Открой Daily, чтобы достать ключ 🗝️", rewards: [{ icon: "🎁", label: "сюрприз" }] },
];

function Chest({ tier, open }: { tier: Tier; open: boolean }) {
  return (
    <div className={`chest ${open ? "is-open" : ""}`} aria-hidden>
      <div className="chest-glow" />
      <div className="chest-sparkles">
        {Array.from({ length: 6 }).map((_, i) => <i key={i} style={cssVars({ "--i": i })} />)}
      </div>
      <div className="chest-burst" />
      <div className="chest-box">
        <div className="chest-base">
          <span className="chest-band" />
          <span className="chest-lockplate"><span className="chest-keyhole" /></span>
        </div>
        <div className="chest-lid">
          <span className="chest-band" />
        </div>
      </div>
    </div>
  );
}

export default function ChestsPage() {
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  return (
    <main className="ch-stage" aria-label="Сундуки">
      <div className="ch-wrap">
        <header className="ch-top">
          <Link className="ch-back" href="/">← На главную</Link>
          <h1>Сундуки</h1>
        </header>
        <p className="ch-intro">Открывай сундуки и забирай звёзды, наклейки и значки! 🗝️</p>

        <div className="ch-grid">
          {CHESTS.map((c) => {
            const isOpen = !!opened[c.id];
            const locked = c.status === "locked";
            return (
              <div key={c.id} className={`ch-card ch-${c.tier}${isOpen ? " open" : ""}${locked ? " locked" : ""}`}>
                <div className="ch-tier-tag">{c.tier === "basic" ? "Бронза" : c.tier === "silver" ? "Серебро" : c.tier === "gold" ? "Золото" : "Секрет"}</div>

                <button
                  className="ch-chest-btn"
                  onClick={() => !locked && setOpened((o) => ({ ...o, [c.id]: true }))}
                  disabled={locked || isOpen}
                  aria-label={locked ? `${c.title} закрыт` : isOpen ? `${c.title} открыт` : `Открыть ${c.title}`}
                >
                  <Chest tier={c.tier} open={isOpen} />
                  {locked && <div className="ch-chains" aria-hidden><span /><span /><div className="ch-padlock">🔒</div></div>}

                  {isOpen && (
                    <div className="ch-rewards">
                      {c.rewards.map((r, i) => (
                        <span key={i} className="ch-reward-chip" style={cssVars({ "--d": `${i * 0.12}s`, "--n": i - (c.rewards.length - 1) / 2 })}>
                          <b className="ch-reward-ic">{r.icon}</b>
                          <span className="ch-reward-lb">{r.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                <div className="ch-title">{c.title}</div>
                {locked ? (
                  <div className="ch-lockmsg">🔒 {c.lockMsg}</div>
                ) : isOpen ? (
                  <div className="ch-done">Получено! 🎉</div>
                ) : (
                  <div className="ch-cta">Нажми, чтобы открыть</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
