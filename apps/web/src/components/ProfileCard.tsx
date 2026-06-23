"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChildProfile } from "@/types/domain";
import { buildAvatarUrl, DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatar";

export function ProfileCard({ profile }: { profile: ChildProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`mysh_avatar_${profile.id}`);
      if (raw) {
        const s = JSON.parse(raw);
        const cfg: AvatarConfig = { ...DEFAULT_AVATAR, ...(s.cfg ?? {}) };
        setAvatarUrl(buildAvatarUrl(cfg, 96));
      }
    } catch {
      /* ignore */
    }
  }, [profile.id]);

  async function switchProfile() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="profile card" style={{ position: "relative" }}>
      <Link href="/profile" aria-label="Открыть профиль" style={{ display: "flex", alignItems: "center", gap: "inherit", textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={avatarUrl} alt="" style={{ objectFit: "cover" }} />
        ) : (
          <div className="avatar" />
        )}
        <div>
          <b>{profile.name}</b>
          <small>{profile.grade} класс</small>
        </div>
      </Link>
      <button
        className="chev"
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню профиля"
        style={{ border: 0, background: "transparent", cursor: "pointer", font: "inherit" }}
      >
        ⌄
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 8,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 10px 28px rgba(37,75,131,.2)",
            padding: 6,
            zIndex: 20,
            minWidth: 170,
          }}
        >
          <button
            onClick={switchProfile}
            style={{
              width: "100%",
              textAlign: "left",
              border: 0,
              background: "transparent",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              color: "#2E8BE6",
            }}
          >
            Сменить профиль
          </button>
        </div>
      )}
    </div>
  );
}
