import { notFound } from "next/navigation";
import { fetchProblem } from "@/lib/olympiad-data";
import { OlympiadScreen } from "@/components/OlympiadScreen";
import "./olympiad.css";
import "@/components/olympiad/olympiad-core.css";

// Прямая ссылка на одну олимпиадную задачу (без прогрессии темы).
// Прохождение темы с уровнями и переводом — на /topics/[themeId].
// Данные: БД (Supabase) с откатом на мок-слой (см. lib/olympiad-data.ts).
export default async function OlympiadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const problem = await fetchProblem(id);
  if (!problem) notFound();
  return <OlympiadScreen problem={problem} />;
}
