import Link from "next/link";
import { getRewards } from "@/lib/mock-data";
import { RewardBadge } from "@/components/RewardBadge";
import "./rewards.css";

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
            <RewardBadge
              key={c.id}
              type={c.type}
              title={c.title}
              description={c.description}
              earned={c.earned}
              earnedAt={c.earnedAt}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
