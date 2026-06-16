import Link from "next/link";
import type { RevisionsSummary, StickerAlbum } from "@/types/domain";

export function SideColumn({
  revisions,
  stickers,
}: {
  revisions: RevisionsSummary;
  stickers: StickerAlbum;
}) {
  const stickerPct = Math.round((stickers.collected / stickers.total) * 100);

  return (
    <aside className="side">
      {/* Мои доработки — всегда доступны */}
      <article className="side-card card revisions">
        <div className="side-title-row">
          <span className="card-ico">✎</span>
          <h2>Мои доработки</h2>
        </div>
        <p>Задания, которые стоит закрепить</p>
        <div className="side-stat">
          {revisions.count} <small>задания</small>
        </div>
        <div className="debt-list">
          <div className="debt-item debt-math has-debt" aria-label="Математика">
            <span className="debt-icon">123</span>
          </div>
          <div className="debt-item debt-rus has-debt" aria-label="Русский">
            <span className="debt-notebook"><i /><i /><i /></span>
          </div>
          <div className="debt-item debt-read locked" aria-label="Чтение">
            <span className="debt-book" />
          </div>
          <div className="debt-item debt-eng locked" aria-label="Английский">
            <span className="debt-icon">ABC</span>
          </div>
        </div>
        <Link className="btn-go" href="/revisions">
          Исправить <span>▶</span>
        </Link>
        <div className="side-num">{revisions.count}</div>
        <img className="block-art" src="/myshmat-assets/revisions.png" alt="" aria-hidden="true" />
      </article>

      {/* Коллекция наклеек — всегда доступна */}
      <article className="side-card card stickers">
        <div className="side-title-row">
          <span className="card-ico">⭐</span>
          <h2>Коллекция наклеек</h2>
        </div>
        <div className="side-stat">
          {stickers.collected} <small>/ {stickers.total}</small>
        </div>
        <div className="progress-line">
          <i style={{ inlineSize: `${stickerPct}%` }} />
        </div>
        <Link className="btn-album" href="/stickers">
          Открыть альбом <span>›</span>
        </Link>
        <img className="block-art" src="/myshmat-assets/stickers.png" alt="" aria-hidden="true" />
      </article>
    </aside>
  );
}
