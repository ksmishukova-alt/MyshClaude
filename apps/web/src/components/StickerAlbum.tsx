"use client";

import { useState } from "react";

interface Sticker {
  id: string;
  emoji: string;
  earned: boolean;
}

const PER_PAGE = 24; // 6×4 — как разворот кляссера

export function StickerAlbum({
  stickers,
  collected,
  total,
}: {
  stickers: Sticker[];
  collected: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(stickers.length / PER_PAGE));
  const [page, setPage] = useState(0);

  const start = page * PER_PAGE;
  const pageStickers = stickers.slice(start, start + PER_PAGE);
  const pct = Math.round((collected / total) * 100);

  return (
    <div className="album">
      <div className="album-progress">
        <div className="album-count">
          <b>{collected}</b> из {total}
        </div>
        <div className="album-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="album-book">
        <button
          className="album-nav prev"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label="Предыдущая страница"
        >
          ‹
        </button>

        <div className="album-page">
          <div className="album-grid">
            {pageStickers.map((s) => (
              <div key={s.id} className={`album-cell${s.earned ? " earned" : " locked"}`}>
                <span>{s.earned ? s.emoji : "?"}</span>
              </div>
            ))}
          </div>
          <div className="album-page-num">
            Страница {page + 1} из {pages}
          </div>
        </div>

        <button
          className="album-nav next"
          onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          disabled={page === pages - 1}
          aria-label="Следующая страница"
        >
          ›
        </button>
      </div>

      <div className="album-dots">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            className={`album-dot${i === page ? " on" : ""}`}
            onClick={() => setPage(i)}
            aria-label={`Страница ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
