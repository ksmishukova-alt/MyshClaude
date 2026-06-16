import Link from "next/link";
import { getStickerAlbum } from "@/lib/mock-data";
import "./stickers.css";

export default function StickersPage() {
  const { collected, total, stickers } = getStickerAlbum();
  const pct = Math.round((collected / total) * 100);
  return (
    <main className="stk-stage" aria-label="Коллекция наклеек">
      <div className="stk-wrap">
        <header className="stk-top">
          <Link className="stk-back" href="/">← На главную</Link>
          <h1>Коллекция наклеек</h1>
        </header>
        <div className="stk-progress card">
          <div className="stk-count"><b>{collected}</b> из {total}</div>
          <div className="stk-bar"><span style={{ width: `${pct}%` }} /></div>
          <p>Собирай наклейки за успехи и открытия! Каждая — за маленькую победу 🌟</p>
        </div>
        <div className="stk-grid">
          {stickers.map((s) => (
            <div key={s.id} className={`stk-cell${s.earned ? " earned" : " locked"}`}>
              <span>{s.earned ? s.emoji : "❓"}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
