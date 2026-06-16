import { getReviewQueue } from "@/lib/mock-data";
import { MethodistPanel } from "@/components/MethodistPanel";
import "./methodist.css";

export default function MethodistPage() {
  const queue = getReviewQueue();
  return (
    <main className="md-stage" aria-label="Панель методиста">
      <header className="md-top">
        <div className="md-logo">
          Мыш<span>Мат</span> · <b>методист</b>
        </div>
      </header>
      <MethodistPanel initialQueue={queue} />
    </main>
  );
}
