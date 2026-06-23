"use client";

/**
 * Рендер питомца. По умолчанию — АНИМИРОВАННЫЙ эмодзи из открытого набора
 * Google Noto Animated Emoji, который грузится прямо с CDN Google по URL.
 * Ничего скачивать и класть в проект не нужно. Если картинка не загрузилась
 * (нет сети/формат), мягко падаем на статичный эмодзи.
 *
 * Стадии передаются размером и аксессуаром (📖/🎓/👑) + «яйцо» до вылупления.
 *
 * ── Опционально: своя Lottie-анимация ────────────────────────────────
 * Если для какого-то вида/стадии захочешь СВОЮ векторную анимацию:
 * 1) npm i @lottiefiles/dotlottie-react
 * 2) положи файл в public/myshmat-assets/pets/<species>-<stage>.lottie
 *    и пропиши путь в PET_SPECIES[...].lottie (src/lib/pet.ts)
 * 3) раскомментируй импорт и ветку с DotLottieReact ниже.
 * --------------------------------------------------------------------
 */

import type { CSSProperties } from "react";
import { getSpecies, STAGES, EGG_NOTO, notoUrl, type PetStageId } from "@/lib/pet";

// import { DotLottieReact } from "@lottiefiles/dotlottie-react"; // ← опционально, см. шаги выше

const cssVars = (o: Record<string, string | number>) => o as unknown as CSSProperties;

export function PetView({
  speciesId,
  stageId,
  size = 150,
  bob = true,
}: {
  speciesId: string | undefined;
  stageId: PetStageId;
  size?: number;
  bob?: boolean;
}) {
  const sp = getSpecies(speciesId);
  const stageIdx = Math.max(0, STAGES.findIndex((s) => s.id === stageId));
  const stage = STAGES[stageIdx] ?? STAGES[0];
  const stagePct = STAGES.length > 1 ? stageIdx / (STAGES.length - 1) : 0;
  // На стадии «яйцо» вид ещё не вылупился.
  const cp = stageId === "egg" ? EGG_NOTO : sp.noto;
  const face = stageId === "egg" ? "🥚" : sp.emoji;
  // const customLottie = sp.lottie?.[stageId]; // ← путь к своей анимации, если задана

  return (
    <div
      className={`pet-view${bob ? " bob" : ""}`}
      style={cssVars({ "--pet-accent": sp.accent, "--pet-size": `${size}px`, "--pet-scale": stage.scale, "--pet-stage": stagePct })}
      aria-label={`${sp.name}, стадия: ${stage.name}`}
    >
      <span className="pet-glow" />

      {/* {customLottie ? (
        <DotLottieReact src={customLottie} loop autoplay className="pet-lottie" />
      ) : ( */}
      {/* Запасной статичный эмодзи (под анимацией; виден, если картинка не загрузится). */}
      <span className="pet-face" aria-hidden>{face}</span>
      {/* Анимированный эмодзи с CDN Google — ничего не качаем. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={cp}
        className="pet-anim"
        src={notoUrl(cp, "webp")}
        alt=""
        aria-hidden
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* )} */}
    </div>
  );
}
