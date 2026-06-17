"use client";

import { useState } from "react";
import type { TaskStep } from "@/types/domain";

/**
 * RU_SENTENCE_ORDER — собрать предложение/текст из карточек.
 * Поддержка и перетаскивания (drag-and-drop), и кликов
 * (клик по карточке в банке → встаёт в конец; клик в строке → возврат в банк).
 * Правильный порядок не подсвечивается.
 */
export function OrderRunner({
  step,
  locked,
  onCheck,
}: {
  step: TaskStep;
  locked: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const cards = step.cards ?? [];
  // массив индексов исходных cards, помещённых в строку (по порядку)
  const [placed, setPlaced] = useState<number[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const inBank = cards.map((_, i) => i).filter((i) => !placed.includes(i));

  function place(i: number) {
    if (locked) return;
    setPlaced((p) => (p.includes(i) ? p : [...p, i]));
  }
  function unplace(i: number) {
    if (locked) return;
    setPlaced((p) => p.filter((x) => x !== i));
  }

  // drag из банка/строки в строку
  function onDrop(targetPos: number) {
    if (locked || dragIdx === null) return;
    setPlaced((p) => {
      const without = p.filter((x) => x !== dragIdx);
      const pos = Math.min(targetPos, without.length);
      return [...without.slice(0, pos), dragIdx, ...without.slice(pos)];
    });
    setDragIdx(null);
  }

  function check() {
    const accepted = step.acceptedOrders ?? [];
    const ok = accepted.some(
      (order) =>
        order.length === placed.length && order.every((v, idx) => v === placed[idx])
    );
    onCheck(ok);
  }

  return (
    <div className="or">
      {/* рабочая строка */}
      <div
        className="or-row"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDrop(placed.length)}
      >
        {placed.length === 0 && <span className="or-placeholder">Перетащи или нажми карточки сюда</span>}
        {placed.map((ci, pos) => (
          <button
            key={ci}
            type="button"
            className="or-card placed"
            draggable={!locked}
            onDragStart={() => setDragIdx(ci)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.stopPropagation();
              onDrop(pos);
            }}
            onClick={() => unplace(ci)}
            disabled={locked}
          >
            {cards[ci]}
          </button>
        ))}
      </div>

      {/* банк карточек */}
      <div className="or-bank">
        {inBank.map((ci) => (
          <button
            key={ci}
            type="button"
            className="or-card"
            draggable={!locked}
            onDragStart={() => setDragIdx(ci)}
            onClick={() => place(ci)}
            disabled={locked}
          >
            {cards[ci]}
          </button>
        ))}
      </div>

      {!locked && (
        <button
          type="button"
          className="ts-cta secondary or-check"
          onClick={check}
          disabled={placed.length !== cards.length}
        >
          Проверить
        </button>
      )}
    </div>
  );
}
