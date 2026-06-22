import { getCurrentChildId } from "@/lib/session";
import { fetchHomeData } from "@/lib/data";
import { fetchThemes, fetchThemeProgressMap } from "@/lib/olympiad-data";
import { getRewards } from "@/lib/mock-data";
import { levelToStage, STAGE_DEFS } from "@/types/olympiad";
import { THEME_STAGE_POINTS, BADGE_POINTS } from "@/lib/pet";
import { ProfileScreen, type ThemeRow } from "@/components/ProfileScreen";
import "./profile.css";

/** Профиль ребёнка — витрина «Я и мой маскот». */
export default async function ProfilePage() {
  const childId = await getCurrentChildId();
  const [home, themes, progress] = await Promise.all([
    fetchHomeData(childId),
    fetchThemes(),
    fetchThemeProgressMap(childId),
  ]);

  const rows: ThemeRow[] = themes
    .filter((t) => progress[t.id] && progress[t.id].state !== "locked")
    .map((t) => {
      const p = progress[t.id];
      const stage = levelToStage(p.currentLevel);
      return {
        id: t.id,
        title: t.title,
        icon: t.icon,
        stage: STAGE_DEFS[stage].name,
        color: STAGE_DEFS[stage].color,
        badge: p.badgeEarned,
      };
    });

  const { stars } = getRewards();

  // Очки роста питомца: копятся из реального прогресса по темам (стадия + значок).
  let petXp = 0;
  for (const t of themes) {
    const p = progress[t.id];
    if (!p || p.state === "locked") continue;
    petXp += THEME_STAGE_POINTS[levelToStage(p.currentLevel)] ?? 0;
    if (p.badgeEarned) petXp += BADGE_POINTS;
  }

  return (
    <ProfileScreen
      childId={childId}
      name={home.profile.name}
      grade={home.profile.grade}
      baseStars={stars}
      themes={rows}
      petXp={petXp}
    />
  );
}
