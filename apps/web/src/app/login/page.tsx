import { getLoginProfiles } from "@/lib/mock-data";
import { getLoginProfilesDb } from "@/lib/data-db";
import { LoginScreen } from "@/components/LoginScreen";
import "./login.css";

export default async function LoginPage() {
  // профили из БД, иначе из моков
  const fromDb = await getLoginProfilesDb();
  const profiles = (fromDb ?? getLoginProfiles()).map((p) => ({
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
