import Link from "next/link";
import type { RevisionsSummary, StickerAlbum, SubjectId } from "@/types/domain";
import { plural } from "@/lib/status";

export function SideColumn({
  revisions,
  stickers,
}: {
  revisions: RevisionsSummary;
  stickers: StickerAlbum;
}) {
  const stickerPct = Math.round((stickers.collected / stickers.total) * 100);
  const debtSubjects = new Set(revisions.items.map((it) => it.subjectId));
  const hasDebt = (s: SubjectId) => debtSubjects.has(s);

  return (
    <aside className="side">
      {/* Мои доработки — всегда доступны */}
      <article className="side-card card revisions">
        <div className="side-title-row">
          <span className="card-ico">✎</span>
          <h2 className="side-title-lg">Мои доработки</h2>
        </div>
        <div className="side-stat">
          {revisions.count} <small>{plural(revisions.count, ["задание", "задания", "заданий"])}</small>
        </div>
        <div className="debt-list">
          <div className={`debt-item debt-math ${hasDebt("math") ? "has-debt" : "locked"}`} aria-label="Математика">
            <span className="debt-icon">123</span>
          </div>
          <div className={`debt-item debt-rus ${hasDebt("russian") ? "has-debt" : "locked"}`} aria-label="Русский">
            <span className="debt-notebook"><i /><i /><i /></span>
          </div>
          <div className={`debt-item debt-read ${hasDebt("reading") ? "has-debt" : "locked"}`} aria-label="Чтение">
            <span className="debt-book" />
          </div>
          <div className={`debt-item debt-eng ${hasDebt("english") ? "has-debt" : "locked"}`} aria-label="Английский">
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
