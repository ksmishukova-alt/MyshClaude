import type { SubjectStatus, TaskMode } from "@/types/domain";

/** Внешний вид чипа статуса предмета на главном экране. */
export interface StatusChip {
  label: string;
  /** ключ цветовой темы чипа */
  tone: "green" | "orange" | "blue" | "gray";
  /** показывать ли точку-иконку слева */
  dot?: string;
}

export function statusToChip(status: SubjectStatus): StatusChip {
  switch (status) {
    case "successful":
    case "perfect":
      return { label: "Готово", tone: "green", dot: "✓" };
    case "submitted":
      return { label: "Ждёт проверку взрослого", tone: "orange", dot: "›" };
    case "needsRevision":
      return { label: "Нужно доработать", tone: "orange", dot: "!" };
    case "inProgress":
      return { label: "Продолжить", tone: "blue" };
    case "notStarted":
    default:
      return { label: "Можно начать", tone: "blue" };
  }
}

/** Подпись пиктограммы режима задания. */
export function modeLabel(mode: TaskMode): string {
  return mode === "platform" ? "на платформе" : "на листочке";
}

export function modeIcon(mode: TaskMode): string {
  return mode === "platform" ? "🖥️" : "✏️";
}
