import Link from "next/link";
import { getRewards } from "@/lib/mock-data";
import "./rewards.css";

const ICON: Record<string, string> = {
  myshroutka: "🐭", perfectDaily: "🌟", skill: "🎯", effort: "💪",
  olympiad: "🏆", collection: "📚", myshPechat: "🔥", surprise: "🎁",
};

// Редкость значка → визуальный «грейд» (как в AAA-играх)
const RARITY: Record<string, string> = {
  myshroutka: "legend", olympiad: "legend",
  perfectDaily: "epic", myshPechat: "epic",
  skill: "rare", collection: "rare",
  effort: "common", surprise: "secret",
};
const RARITY_LABEL: Record<string, string> = {
  legend: "Легендарный", epic: "Эпический", rare: "Редкий", common: "Обычный", secret: "Секрет",
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
          {cards.map((c) => {
            const rarity = c.earned ? RARITY[c.type] ?? "rare" : "locked";
            return (
              <div key={c.id} className={`rw-badge r-${rarity}${c.earned ? " earned" : " locked"}`}>
                {c.earned && <div className="rw-rays" aria-hidden />}
                <div className="rw-medal">
                  <div className="rw-medal-core">
                    <span className="rw-emblem">{c.earned ? ICON[c.type] ?? "🏅" : "🔒"}</span>
                  </div>
                  <div className="rw-shine" aria-hidden />
                  {c.earned && <span className="rw-rarity">{RARITY_LABEL[RARITY[c.type] ?? "rare"]}</span>}
                </div>
                <div className="rw-ribbon"><span>{c.title}</span></div>
                <div className="rw-card-desc">{c.description}</div>
                {c.earned && c.earnedAt && <div className="rw-date">получено {c.earnedAt}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
