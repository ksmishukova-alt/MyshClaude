"use client";

import { useRouter } from "next/navigation";
import type { OlympiadProblemV2 } from "@/types/olympiad";
import { LEVEL_SPECS } from "@/types/olympiad";
import { OlympiadRunner } from "@/components/olympiad/OlympiadRunner";

/**
 * Standalone-экран одной олимпиадной задачи (прямая ссылка /olympiad/[id]).
 * Прохождение темы с уровнями и прогрессией — на /topics/[themeId].
 */
export function OlympiadScreen({ problem }: { problem: OlympiadProblemV2 }) {
  const router = useRouter();
  const spec = LEVEL_SPECS[problem.level];
  return (
    <main className="olymp-stage" aria-label={`Олимпиада: ${problem.title}`}>
      <div className="olymp-wrap olr-wrap">
        <header className="ts-top">
          <button className="ts-back" onClick={() => router.push("/topics")}>← К темам</button>
          <div className="ts-progress">🏆 {spec.title}</div>
          <span className="olymp-reward">★ +{problem.rewardStars}</span>
        </header>
        <div style={{ padding: "clamp(16px,2.2vw,30px)" }}>
          <OlympiadRunner problem={problem} onComplete={() => {}} />
        </div>
      </div>
    </main>
  );
}
