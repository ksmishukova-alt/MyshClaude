import Link from "next/link";

export default function RewardsPage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24,
      background: "linear-gradient(180deg,#cfe9ff,#9ad472)", fontFamily: "system-ui" }}>
      <div style={{ background: "rgba(255,255,255,.95)", borderRadius: 24, padding: 40, textAlign: "center",
        boxShadow: "0 16px 44px rgba(37,75,131,.18)", maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🚧</div>
        <h1 style={{ color: "#082460", marginBottom: 8 }}>Скоро откроется</h1>
        <p style={{ color: "#5b6a86", marginBottom: 20 }}>Этот раздел в разработке.</p>
        <Link href="/" style={{ background: "#2E8BE6", color: "#fff", padding: "12px 22px",
          borderRadius: 999, textDecoration: "none", fontWeight: 700 }}>← На главную</Link>
      </div>
    </main>
  );
}
