import Link from "next/link";
import { getTopicMap } from "@/lib/mock-data";
import "./topics.css";

export default function TopicsPage() {
  const islands = getTopicMap();
  // первый доступный остров — для кнопки «Вперёд!»
  const firstOpen = islands.find((i) => i.state !== "locked" && i.problemId);
  return (
    <main className="top-stage" aria-label="Карта тем">
      <div className="top-wrap">
        <header className="top-top">
          <Link className="top-back" href="/">← На главную</Link>
          <h1>Карта тем</h1>
        </header>
        <p className="top-intro">Олимпиадный маршрут. Открывай острова, решай задачи и собирай звёзды ⭐</p>

        {firstOpen?.problemId && (
          <Link className="top-cta" href={`/olympiad/${firstOpen.problemId}`}>
            Вперёд! <span>▶</span>
          </Link>
        )}

        <div className="top-islands">
          {islands.map((isl, i) => {
            const inner = (
              <>
                <span className="top-isl-num">{i + 1}</span>
                <span className="top-isl-title">{isl.title}</span>
                <span className="top-isl-stars">
                  {"★".repeat(isl.stars)}
                  <span className="muted">{"★".repeat(isl.starsMax - isl.stars)}</span>
                </span>
                {isl.state === "locked" && <span className="top-lock">🔒</span>}
              </>
            );
            const cls = `top-isl ${isl.state}`;
            return isl.state !== "locked" && isl.problemId ? (
              <Link key={isl.id} className={cls} href={`/olympiad/${isl.problemId}`}>
                {inner}
              </Link>
            ) : (
              <div key={isl.id} className={cls} aria-disabled="true">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
