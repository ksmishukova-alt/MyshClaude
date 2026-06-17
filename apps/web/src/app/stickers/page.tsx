import Link from "next/link";
import { getStickerAlbum } from "@/lib/mock-data";
import { StickerAlbum } from "@/components/StickerAlbum";
import "./stickers.css";

export default function StickersPage() {
  const { collected, total, stickers } = getStickerAlbum();
  return (
    <main className="stk-stage" aria-label="Коллекция наклеек">
      <div className="stk-wrap">
        <header className="stk-top">
          <Link className="stk-back" href="/">← На главную</Link>
          <h1>Коллекция наклеек</h1>
        </header>
        <p className="stk-intro">Собирай наклейки за успехи и открытия! Листай страницы стрелками 🌟</p>
        <StickerAlbum stickers={stickers} collected={collected} total={total} />
      </div>
    </main>
  );
}
