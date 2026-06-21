"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import "./chests.css";

const cssVars = (o: Record<string, string | number>) => o as unknown as CSSProperties;

type Tier = "basic" | "silver" | "gold" | "secret";
type Status = "locked" | "ready" | "open" | "collected";
interface Reward { icon: string; value: string; }
interface ChestItem {
  id: string;
  tier: Tier;
  title: string;
  initial: "locked" | "ready";
  lockMsg?: string;
  rewards: Reward[];
}

const CHESTS: ChestItem[] = [
  { id: "c1", tier: "gold", title: "МышРутка · Сундук острова", initial: "ready",
    rewards: [{ icon: "⭐", value: "+250" }, { icon: "💎", value: "+15" }, { icon: "🏅", value: "значок" }] },
  { id: "c2", tier: "basic", title: "Бронзовый сундук", initial: "ready",
    rewards: [{ icon: "⭐", value: "+15" }, { icon: "🦊", value: "наклейка" }] },
  { id: "c3", tier: "silver", title: "Серебряный сундук", initial: "locked",
    lockMsg: "Реши 3 задачи, чтобы получить ключ", rewards: [{ icon: "⭐", value: "+30" }, { icon: "💎", value: "редкая наклейка" }] },
  { id: "c4", tier: "secret", title: "Секретный сундук", initial: "locked",
    lockMsg: "Открой Daily, чтобы достать ключ", rewards: [{ icon: "🎁", value: "сюрприз" }] },
];

/** Стиль арта сундука по тиру (файлы: chest-{state}-{style}.png). */
const STYLE: Record<Tier, string> = { gold: "gold", silver: "silver", basic: "simple", secret: "gold" };

/**
 * Сундук: PNG из /myshmat-assets/chest-{closed|locked|open}-{gold|silver|simple}.png,
 * иначе CSS-арт (фолбэк).
 */
function Chest({ status, tier }: { status: Status; tier: Tier }) {
  const [imgOk, setImgOk] = useState(true);
  const open = status === "open" || status === "collected";
  const stateName = status === "locked" ? "locked" : open ? "open" : "closed";
  const src = `/myshmat-assets/chest-${stateName}-${STYLE[tier]}.png`;
  return (
    <div className={`chest ${open ? "is-open" : ""}`} aria-hidden>
      <div className="chest-glow" />
      <div className="chest-burst" />
      <div className="chest-sparkles">
        {Array.from({ length: 6 }).map((_, i) => <i key={i} style={cssVars({ "--i": i })} />)}
      </div>
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="chest-img" src={src} alt="" onError={() => setImgOk(false)} />
      ) : (
        <div className="chest-stack">
          <div className="chest-lid">
            <span className="chest-strap l" /><span className="chest-strap r" /><span className="chest-lid-shine" />
          </div>
          <div className="chest-base">
            <span className="chest-strap l" /><span className="chest-strap r" />
            <span className="chest-corner tl" /><span className="chest-corner tr" />
            <span className="chest-corner bl" /><span className="chest-corner br" />
            <span className="chest-lockplate"><span className="chest-keyhole" /></span>
          </div>
          <div className="chest-shadow" />
          {status === "locked" && <div className="ch-chains"><span /><span /><div className="ch-padlock">🔒</div></div>}
        </div>
      )}
    </div>
  );
}

export default function ChestsPage() {
  const [state, setState] = useState<Record<string, Status>>(
    Object.fromEntries(CHESTS.map((c) => [c.id, c.initial])),
  );
  const set = (id: string, s: Status) => setState((m) => ({ ...m, [id]: s }));

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
            const st = state[c.id];
            return (
              <div key={c.id} className={`ch-card ch-${c.tier} st-${st}`}>
                <div className="ch-tier-tag">{c.tier === "basic" ? "Бронза" : c.tier === "silver" ? "Серебро" : c.tier === "gold" ? "Золото" : "Секрет"}</div>

                <div className="ch-scene">
                  <Chest status={st} tier={c.tier} />
                  {st === "open" && (
                    <div className="ch-fly" aria-hidden>
                      {c.rewards.map((r, i) => (
                        <span key={i} className="ch-fly-ic" style={cssVars({ "--d": `${i * 0.1}s`, "--n": i - (c.rewards.length - 1) / 2 })}>{r.icon}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ch-title">{c.title}</div>

                {st === "locked" && (
                  <div className="ch-panel locked">
                    <div className="ch-status"><span className="ch-status-ic">🔒</span><b>Заперт</b></div>
                    <div className="ch-lockmsg">{c.lockMsg}</div>
                  </div>
                )}

                {st === "ready" && (
                  <div className="ch-panel">
                    <div className="ch-status ready"><span className="ch-status-ic">★</span><b>Готов к открытию!</b></div>
                    <button className="ch-btn" onClick={() => set(c.id, "open")}>Открыть сундук →</button>
                  </div>
                )}

                {st === "open" && (
                  <div className="ch-panel rewards">
                    <div className="ch-rw-title">✦ Твои награды! ✦</div>
                    <div className="ch-rw-tiles">
                      {c.rewards.map((r, i) => (
                        <div key={i} className="ch-rw-tile" style={cssVars({ "--d": `${0.15 + i * 0.1}s` })}>
                          <span className="ch-rw-ic">{r.icon}</span>
                          <span className="ch-rw-val">{r.value}</span>
                        </div>
                      ))}
                    </div>
                    <button className="ch-btn collect" onClick={() => set(c.id, "collected")}>Забрать награды!</button>
                  </div>
                )}

                {st === "collected" && (
                  <div className="ch-panel">
                    <div className="ch-status done"><span className="ch-status-ic">🎉</span><b>Награды забраны!</b></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
