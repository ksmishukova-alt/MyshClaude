import { AdultLogin } from "@/components/AdultLogin";
import "../login/login.css";
import "./enter.css";

/** Вход для взрослых (методист / родитель). Дети сюда не ходят — у них /login. */
export default function EnterPage() {
  return (
    <main className="lg-stage" aria-label="Вход для взрослых">
      <div className="lg-logo">
        Мыш<span>Мат</span>
      </div>
      <AdultLogin />
    </main>
  );
}
