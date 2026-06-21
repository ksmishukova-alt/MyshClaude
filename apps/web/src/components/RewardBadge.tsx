"use client";

import { useState } from "react";

/**
 * Значок награды. Если есть PNG в /myshmat-assets/reward-<type>.png — показываем его
 * (полноценная карточка-значок с текстом). Иначе — CSS-медаль (фолбэк).
 * Файлы: reward-myshroutka / reward-perfectDaily / reward-skill / reward-effort /
 *        reward-olympiad / reward-collection / reward-myshPechat / reward-surprise (.png)
 */

const ICON: Record<string, string> = {
  myshroutka: "🐭", perfectDaily: "🌟", skill: "🎯", effort: "💪",
  olympiad: "🏆", collection: "📚", myshPechat: "🔥", surprise: "🎁",
};
const RARITY: Record<string, string> = {
  myshroutka: "legend", olympiad: "rare", perfectDaily: "epic", myshPechat: "legend",
  skill: "rare", collection: "epic", effort: "common", surprise: "secret",
};
const RARITY_LABEL: Record<string, string> = {
  legend: "Легендарный", epic: "Эпический", rare: "Редкий", common: "Обычный", secret: "Секрет",
};

export function RewardBadge({
  type, title, description, earned, earnedAt,
}: {
  type: string; title: string; description: string; earned: boolean; earnedAt?: string;
}) {
  const [imgOk, setImgOk] = useState(true);

  if (earned && imgOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="rw-badge-img"
        src={`/myshmat-assets/reward-${type}.png`}
        alt={title}
        loading="lazy"
        onError={() => setImgOk(false)}
      />
    );
  }

  // ── фолбэк: CSS-медаль ──
  const rarity = earned ? RARITY[type] ?? "rare" : "locked";
  return (
    <div className={`rw-badge r-${rarity}${earned ? " earned" : " locked"}`}>
      {earned && <div className="rw-rays" aria-hidden />}
      <div className="rw-medal">
        <div className="rw-medal-core"><span className="rw-emblem">{earned ? ICON[type] ?? "🏅" : "🔒"}</span></div>
        <div className="rw-shine" aria-hidden />
        {earned && <span className="rw-rarity">{RARITY_LABEL[RARITY[type] ?? "rare"]}</span>}
      </div>
      <div className="rw-ribbon"><span>{title}</span></div>
      <div className="rw-card-desc">{description}</div>
      {earned && earnedAt && <div className="rw-date">получено {earnedAt}</div>}
    </div>
  );
}
