import Link from "next/link";
import { getRewards } from "@/lib/mock-data";
import "./rewards.css";

const ICON: Record<string, string> = {
  myshroutka: "🐭", perfectDaily: "🌟", skill: "🎯", effort: "💪",
  olympiad: "🏆", collection: "📚", myshPechat: "🔥", surprise: "🎁",
};

export default function RewardsPage() {
  const { stars, cards } = getRewards();
  const earned = cards.filter((c) => c.earned).length;
  return (
    <main className="rw-stage" aria-label="Награды">
      <div className="rw-wrap">
        <header className="rw-top">
          <Link className="rw-back" href="/">← На главную</Link>
          <h1>Награды</h1>
          <span className="rw-stars">★ {stars}</span>
        </header>
        <p className="rw-intro">Получено наград: <b>{earned}</b> из <b>{cards.length}</b>. Собирай за достижения и упорство!</p>
        <div className="rw-grid">
          {cards.map((c) => (
            <div key={c.id} className={`rw-card${c.earned ? " earned" : " locked"}`}>
              <div className="rw-ic">{c.earned ? ICON[c.type] ?? "🏅" : "🔒"}</div>
              <div className="rw-card-title">{c.title}</div>
              <div className="rw-card-desc">{c.description}</div>
              {c.earned && c.earnedAt && <div className="rw-date">получено {c.earnedAt}</div>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
