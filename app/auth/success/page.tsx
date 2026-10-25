"use client";

import { ArrowRight } from "lucide-react";

function AuthSuccessContent() {
  return (
    <main className="auth-page">
      <section className="auth-sheet">
        <div className="admin-brand">
          <img src="/sushi_logo_without_bg.png" alt="" />
          <span>Sushi</span>
        </div>
        <h1>You are signed in</h1>
        <p>
          Finishing your connection with Sushi Auto-Buyer.
        </p>
        <div className="auth-instruction">
          This tab closes automatically once the extension saves your session.
          If it stays open, return to the extension and try signing in again.
        </div>
        <button className="primary" onClick={() => window.close()}>
          Close this window <ArrowRight size={16} />
        </button>
      </section>
    </main>
  );
}

export default function AuthSuccessPage() {
  return <AuthSuccessContent />;
}
