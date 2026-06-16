import { getLoginProfiles } from "@/lib/mock-data";
import { LoginScreen } from "@/components/LoginScreen";
import "./login.css";

export default function LoginPage() {
  const profiles = getLoginProfiles().map((p) => ({
    id: p.id,
    name: p.name,
    grade: p.grade,
    shortCode: p.shortCode,
  }));
  return (
    <main className="lg-stage" aria-label="Вход в МышМат">
      <div className="lg-logo">
        Мыш<span>Мат</span>
      </div>
      <LoginScreen profiles={profiles} />
    </main>
  );
}
