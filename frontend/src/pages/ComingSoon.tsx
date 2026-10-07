import { Link } from "react-router-dom";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="wrap" style={{ paddingBlock: "96px", minHeight: "60vh" }}>
      <h1 style={{ fontWeight: 300, fontSize: "clamp(28px, 3.6vw, 40px)", letterSpacing: "-0.02em", lineHeight: 1.25, margin: "0 0 12px" }}>{title}</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 24px" }}>Trang này đang được xây dựng.</p>
      <Link to="/">← Về trang chủ</Link>
    </main>
  );
}
