import { fetchHomeData } from "@/lib/data";
import { buildWorldState } from "@/types/domain";
import { ProfileCard } from "@/components/ProfileCard";
import { Hero } from "@/components/Hero";
import { DailyCard } from "@/components/DailyCard";
import { SideColumn } from "@/components/SideColumn";
import { RouteRow, WorldRow } from "@/components/WorldZone";

export default async function HomePage() {
  const data = await fetchHomeData();
  const world = buildWorldState(data.session);

  return (
    <main className="stage" aria-label="Главный экран МышМат">
      <section className="board">
        <div className="logo">
          <div className="word">
            Мыш<span>Мат</span>
          </div>
          <div className="tag">Мышление в математике</div>
        </div>

        <ProfileCard profile={data.profile} />
        <Hero name={data.profile.name} />
        <DailyCard session={data.session} week={data.week} />
        <SideColumn revisions={data.revisions} stickers={data.stickers} />
        <RouteRow world={world} />
        <WorldRow world={world} />
      </section>
    </main>
  );
}
