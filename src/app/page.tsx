'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [titleText, setTitleText] = useState('');
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/play');
    }
  }, [ready, authenticated, router]);

  // Typewriter effect for title
  useEffect(() => {
    if (!ready) return;

    const finalText = 'SPROUTS';
    let currentIndex = 0;

    const typeInterval = setInterval(() => {
      if (currentIndex <= finalText.length) {
        setTitleText(finalText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setShowContent(true), 300);
      }
    }, 100);

    return () => clearInterval(typeInterval);
  }, [ready]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Centered Window */}
      <div className="win95-window w-full max-w-lg">
        {/* Title Bar */}
        <div className="win95-titlebar">
          <span className="win95-titlebar-text">Welcome to Sprouts</span>
          <div className="win95-titlebar-buttons">
            <button className="win95-titlebar-btn">_</button>
            <button className="win95-titlebar-btn">□</button>
            <button className="win95-titlebar-btn">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="win95-content p-8">
          {/* Logo Area */}
          <div className="text-center mb-8">
            {/* Decorative icon */}
            <div className="inline-block mb-4">
              <div
                className="w-16 h-16 mx-auto"
                style={{
                  background: 'linear-gradient(135deg, var(--win95-lightest) 0%, var(--win95-accent-light) 100%)',
                  border: '2px solid var(--win95-border-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                }}
              >
                🌱
              </div>
            </div>

            {/* Title with cursor */}
            <h1
              className="win95-title-lg text-center mb-2"
              style={{
                letterSpacing: '4px',
                minHeight: '48px',
              }}
            >
              {titleText}
              <span className="win95-blink" style={{ marginLeft: '2px' }}>_</span>
            </h1>

            <p className="win95-subtitle" style={{ color: 'var(--win95-text-dim)' }}>
              Life Simulation Game
            </p>
          </div>

          {/* Divider */}
          <div className="win95-divider mb-6" />

          {/* Description */}
          <div className="win95-panel-inset p-4 mb-6">
            <p className="win95-text text-center" style={{ lineHeight: '1.6' }}>
              Your choices. Your consequences. Your life.
            </p>
            <p className="win95-text-sm text-center mt-2" style={{ color: 'var(--win95-text-dim)' }}>
              Create a character, build relationships, and navigate the drama of everyday life in this unfiltered simulation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className={`flex flex-col gap-3 transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            {ready && !authenticated && (
              <>
                <button
                  onClick={login}
                  className="win95-btn win95-btn-lg w-full"
                  style={{
                    background: 'var(--win95-title-active)',
                    color: 'white',
                    borderColor: 'var(--win95-accent-light) var(--win95-accent) var(--win95-accent) var(--win95-accent-light)',
                  }}
                >
                  Sign Up / Log In
                </button>
                <p className="win95-text-sm text-center" style={{ color: 'var(--win95-text-dim)' }}>
                  Create an account or sign in to continue
                </p>
              </>
            )}

            {!ready && (
              <div className="text-center py-4">
                <span className="win95-text win95-loading">Loading</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="win95-statusbar">
          <div className="win95-statusbar-section">
            Ready
          </div>
          <div className="win95-statusbar-section" style={{ flex: '0 0 auto', width: '100px' }}>
            v1.0
          </div>
        </div>
      </div>

      {/* Background decoration - subtle grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage: `
            linear-gradient(var(--win95-dark) 1px, transparent 1px),
            linear-gradient(90deg, var(--win95-dark) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          opacity: 0.1,
        }}
      />
    </main>
  );
}
