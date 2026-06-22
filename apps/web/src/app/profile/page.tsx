import { getCurrentChildId } from "@/lib/session";
import { fetchHomeData } from "@/lib/data";
import { fetchThemes, fetchThemeProgressMap } from "@/lib/olympiad-data";
import { getRewards } from "@/lib/mock-data";
import { levelToStage, STAGE_DEFS } from "@/types/olympiad";
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

  return (
    <ProfileScreen
      childId={childId}
      name={home.profile.name}
      grade={home.profile.grade}
      baseStars={stars}
      themes={rows}
    />
  );
}
