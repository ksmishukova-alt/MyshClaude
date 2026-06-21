import Link from "next/link";
import type { WorldState } from "@/types/domain";

/**
 * Игровой мир. Все зоны открываются одним событием — получением МышРутки
 * (когда все 4 предмета Daily доведены до submitted).
 *
 * Когда world.unlocked === false: карточки в состоянии .is-locked
 * (блюр + подпись «Откроется после Daily»), клики отключены.
 */

const LOCK_NOTE = "Откроется после Daily";

export function RouteRow({ world }: { world: WorldState }) {
  const locked = !world.unlocked;
  const lockedClass = locked ? " is-locked" : "";

  return (
    <div className="route">
      <CardOrLink locked={locked} href="/topics" className={`route-card route-map${lockedClass}`}>
        <h2>Олимпиадный маршрут</h2>
        <div className="closed">{locked ? LOCK_NOTE : "Открыть карту тем"}</div>
      </CardOrLink>

      <CardOrLink locked={locked} href="/lifehacks" className={`route-card route-lh${lockedClass}`}>
        <h2>Лайфхаки</h2>
        <div className="closed">{locked ? LOCK_NOTE : "Смотреть лайфхаки"}</div>
      </CardOrLink>
    </div>
  );
}

export function WorldRow({ world }: { world: WorldState }) {
  const locked = !world.unlocked;
  const lockedClass = locked ? " is-locked" : "";

  return (
    <section className="world">
      <CardOrLink locked={locked} href="/chests" className={`mini card chest${lockedClass}`}>
        <h3>Сундуки</h3>
        <p>{locked ? "Награда после Daily ждёт!" : "Открой награды"}</p>
        <div className="closed" />
        <img className="mini-art" src="/myshmat-assets/chest-large.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </CardOrLink>

      {/* Дуэли — на MVP всегда «скоро», без текста */}
      <article className="mini card duel">
        <h3>Дуэли</h3>
        <img className="mini-art" src="/myshmat-assets/duel-large.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </article>

      <CardOrLink locked={locked} href="/rewards" className={`mini card trophy${lockedClass}`}>
        <h3>Награды</h3>
        <img className="mini-art" src="/myshmat-assets/trophy-large.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </CardOrLink>
    </section>
  );
}

/** Когда разблокировано — кликабельная ссылка; когда нет — статичная карточка. */
function CardOrLink({
  locked,
  href,
  className,
  children,
}: {
  locked: boolean;
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (locked) {
    return (
      <article className={className} aria-disabled="true">
        {children}
      </article>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
