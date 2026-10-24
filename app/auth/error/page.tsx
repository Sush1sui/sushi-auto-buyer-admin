"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "unknown_error";
  return (
    <main className="auth-page">
      <section className="auth-sheet">
        <div className="admin-brand">
          <img src="/sushi_logo_without_bg.png" alt="" />
          <span>Sushi</span>
        </div>
        <h1>We could not sign you in</h1>
        <p>
          Try connecting with Discord again. If this continues, share this error
          code with your operator: <code className="error-text">{error}</code>.
        </p>
        <a className="primary" href="/api/auth/discord">
          <RotateCcw size={16} />
          Try again
        </a>
      </section>
    </main>
  );
}
export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page" role="status">
          Loading...
        </main>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
