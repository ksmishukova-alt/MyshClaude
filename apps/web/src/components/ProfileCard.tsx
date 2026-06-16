import type { ChildProfile } from "@/types/domain";

export function ProfileCard({ profile }: { profile: ChildProfile }) {
  return (
    <div className="profile card">
      <div className="avatar" />
      <div>
        <b>{profile.name}</b>
        <small>{profile.grade} класс</small>
      </div>
      <div className="chev">⌄</div>
    </div>
  );
}
