'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/play');
    }
  }, [ready, authenticated, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(var(--pixel-border) 1px, transparent 1px),
              linear-gradient(90deg, var(--pixel-border) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="max-w-2xl text-center relative z-10">
        {/* Decorative corner pieces */}
        <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-[var(--pixel-gold)]" />
        <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-[var(--pixel-gold)]" />
        <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-[var(--pixel-gold)]" />
        <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-[var(--pixel-gold)]" />

        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="pixel-title-large mb-4">LifeSim</h1>
          <p className="pixel-text text-[var(--pixel-text-dim)] text-2xl">
            Your choices. Your consequences. Your life.
          </p>
        </div>

        {/* Description */}
        <div className="pixel-frame mb-8 text-left">
          <p className="pixel-text text-[var(--pixel-text)] mb-6">
            Step into a hyper-personalized life simulation where every decision ripples through your
            world. Build relationships with AI-driven characters who remember everything, pursue
            your ambitions, and watch as consequences unfold in unexpected ways.
          </p>

          <div className="pixel-frame-inset">
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="pixel-label text-[var(--pixel-gold)]">&gt;</span>
                <span className="pixel-text">10+ unique NPCs with distinct personalities</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="pixel-label text-[var(--pixel-gold)]">&gt;</span>
                <span className="pixel-text">Emergent storytelling that adapts to you</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="pixel-label text-[var(--pixel-gold)]">&gt;</span>
                <span className="pixel-text">Consequence chains that spread like wildfire</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="pixel-label text-[var(--pixel-gold)]">&gt;</span>
                <span className="pixel-text">4 save slots for different lives</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        {ready ? (
          <button onClick={login} className="pixel-btn pixel-btn-primary text-sm px-10 py-4">
            Begin Your Story
          </button>
        ) : (
          <div className="pixel-text text-[var(--pixel-text-dim)]">
            <span className="pixel-loading">Loading</span>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 pixel-text-small">
          18+ &bull; Unfiltered content &bull; Your data stays local
        </p>
      </div>
    </main>
  );
}
