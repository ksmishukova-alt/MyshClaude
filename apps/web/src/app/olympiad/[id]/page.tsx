import { notFound } from "next/navigation";
import { getOlympiadProblem } from "@/lib/mock-data";
import { OlympiadScreen } from "@/components/OlympiadScreen";
import "./olympiad.css";

export default async function OlympiadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const problem = getOlympiadProblem(id);
  if (!problem) notFound();
  return <OlympiadScreen problem={problem} />;
}
