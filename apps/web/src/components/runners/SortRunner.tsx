"use client";

import { useState } from "react";
import type { TaskStep } from "@/types/domain";

/**
 * Сортировка слов по колонкам (2-4 группы).
 * Drag-and-drop и клик: клик по чипу в банке → выбран активный чип,
 * клик по колонке → переносит выбранный чип туда. Также работает перетаскивание.
 * Правильные места не подсвечиваются.
 */
export function SortRunner({
  step,
  locked,
  onCheck,
}: {
  step: TaskStep;
  locked: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const columns = step.columns ?? [];
  const chips = step.chips ?? [];
  // placement[chipIndex] = индекс колонки или -1 (в банке)
  const [placement, setPlacement] = useState<number[]>(() => chips.map(() => -1));
  const [active, setActive] = useState<number | null>(null);
  const [dragChip, setDragChip] = useState<number | null>(null);

  function put(chipIdx: number, col: number) {
    if (locked) return;
    setPlacement((p) => p.map((v, i) => (i === chipIdx ? col : v)));
    setActive(null);
  }

  function onColumnClick(col: number) {
    if (locked || active === null) return;
    put(active, col);
  }

  function check() {
    const ok = chips.every((c, i) => placement[i] === c.column);
    onCheck(ok);
  }

  const bank = chips.map((_, i) => i).filter((i) => placement[i] === -1);
  const allPlaced = placement.every((p) => p !== -1);

  return (
    <div className="srt">
      {/* банк */}
      <div
        className="srt-bank"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => dragChip !== null && put(dragChip, -1)}
      >
        {bank.length === 0 && <span className="srt-empty">Все слова распределены</span>}
        {bank.map((ci) => (
          <button
            key={ci}
            type="button"
            className={`srt-chip${active === ci ? " active" : ""}`}
            draggable={!locked}
            onDragStart={() => setDragChip(ci)}
            onClick={() => setActive((a) => (a === ci ? null : ci))}
            disabled={locked}
          >
            {chips[ci].text}
          </button>
        ))}
      </div>

      {/* колонки */}
      <div className={`srt-cols cols-${columns.length}`}>
        {columns.map((col, ci) => (
          <div
            key={ci}
            className="srt-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragChip !== null && put(dragChip, ci)}
            onClick={() => onColumnClick(ci)}
          >
            <div className="srt-col-title">{col}</div>
            <div className="srt-col-body">
              {chips.map((c, idx) =>
                placement[idx] === ci ? (
                  <button
                    key={idx}
                    type="button"
                    className="srt-chip placed"
                    draggable={!locked}
                    onDragStart={() => setDragChip(idx)}
                    onClick={(e) => {
                      e.stopPropagation();
                      put(idx, -1);
                    }}
                    disabled={locked}
                  >
                    {c.text}
                  </button>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>

      {!locked && (
        <button
          type="button"
          className="ts-cta secondary srt-check"
          onClick={check}
          disabled={!allPlaced}
        >
          Проверить
        </button>
      )}
    </div>
  );
}
