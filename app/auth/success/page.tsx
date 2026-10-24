"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

function AuthSuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const discordId = searchParams.get("discordId");
  const username = searchParams.get("username");
  const avatar = searchParams.get("avatar");

  useEffect(() => {
    // Notify window.opener if opened via popup window
    if (window.opener && token) {
      window.opener.postMessage(
        {
          type: "SUSHI_AUTH_SUCCESS",
          payload: { token, discordId, username, avatar },
        },
        "*",
      );
    }
  }, [token, discordId, username, avatar]);

  return (
    <main className="auth-page">
      <section className="auth-sheet">
        <div className="admin-brand">
          <img src="/sushi_logo_without_bg.png" alt="" />
          <span>Sushi</span>
        </div>
        <h1>You are signed in</h1>
        <p>
          Welcome, <strong>{username || "Discord User"}</strong>. Your session
          is now connected with Sushi Auto-Buyer.
        </p>
        <div className="auth-instruction">
          Return to the extension to check your pass and set up your auto-buyer.
          You can close this tab.
        </div>
        <button className="primary" onClick={() => window.close()}>
          Close this window <ArrowRight size={16} />
        </button>
      </section>
    </main>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page" role="status">
          Connecting your account...
        </main>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  );
}
