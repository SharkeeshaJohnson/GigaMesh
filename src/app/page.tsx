'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

// Featured sprites for the landing page
const HERO_SPRITES = [
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2dc75f18-f7ea-40e7-8fb0-489f59c3a3a1/rotations/south.png?t=1765310837621',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/046f0dc6-9ba6-4e4b-9204-aca8d60d8f3b/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/70a91e3d-0b5a-4547-85ef-0f63f8a045e3/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/d8159f31-5aa3-463f-a3ca-f982d0bf2ecb/rotations/south.png',
  'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/25eed221-84a2-4fe1-8e5e-8d6293c7b871/rotations/south.png',
];

// Mascot sprite (used as logo)
const MASCOT_SPRITE = 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/62c02269-903c-4d4a-a8ec-710cbb195b08/rotations/south.png';

// Floating particle component
function Particle() {
  const style = useMemo(() => {
    const size = 4 + Math.random() * 4;
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const delay = Math.random() * 3;
    const duration = 2 + Math.random() * 2;

    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `${left}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    };
  }, []);

  return <div className="particle" style={style} />;
}

export default function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [titleText, setTitleText] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/play');
    }
  }, [ready, authenticated, router]);

  // Typewriter effect for title
  useEffect(() => {
    if (!ready) return;

    const finalText = 'LifeSim';
    let currentIndex = 0;

    const typeInterval = setInterval(() => {
      if (currentIndex <= finalText.length) {
        setTitleText(finalText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setShowContent(true), 200);
      }
    }, 120);

    return () => clearInterval(typeInterval);
  }, [ready]);

  const handleButtonClick = () => {
    setButtonPressed(true);
    setTimeout(() => {
      login();
      setButtonPressed(false);
    }, 150);
  };

  return (
    <main className="hero">
      {/* Floating particles background */}
      <div className="particles">
        {Array.from({ length: 15 }).map((_, i) => (
          <Particle key={i} />
        ))}
      </div>

      {/* Mascot Sprite (Logo) */}
      <div
        className="mb-6 animate-fade-slide-up"
        style={{ animationDelay: '0s' }}
      >
        <div
          className="avatar avatar-xl sprite-idle"
          style={{
            background: 'linear-gradient(135deg, rgba(166, 130, 255, 0.15) 0%, rgba(88, 135, 255, 0.1) 100%)',
            border: '3px solid rgba(166, 130, 255, 0.3)',
            borderRadius: '20px',
          }}
        >
          <img
            src={MASCOT_SPRITE}
            alt="LifeSim Character"
            className="sprite"
            style={{ width: '80px', height: '80px' }}
          />
        </div>
      </div>

      {/* Title with typewriter effect */}
      <h1 className="hero-title">
        {titleText}
        <span
          className="inline-block ml-1"
          style={{
            animation: 'cursor-blink 1s step-end infinite',
            color: 'var(--color-primary)',
          }}
        >
          _
        </span>
      </h1>

      {/* Tagline */}
      <p className="hero-subtitle">
        Your choices. Your consequences. Your life.
      </p>

      {/* Character showcase */}
      <div
        className={`hero-sprites ${showContent ? 'opacity-100' : 'opacity-0'}`}
        style={{ transition: 'opacity 0.5s ease' }}
      >
        {HERO_SPRITES.map((spriteUrl, index) => (
          <div
            key={index}
            className="avatar avatar-lg sprite-idle"
            style={{
              animationDelay: `${index * 0.2}s`,
              background: 'linear-gradient(135deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%)',
            }}
          >
            <img
              src={spriteUrl}
              alt={`Character ${index + 1}`}
              className="sprite"
              style={{ width: '64px', height: '64px' }}
            />
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className={`hero-cta ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {ready && !authenticated && (
          <button
            onClick={handleButtonClick}
            className={`btn btn-primary btn-lg ${buttonPressed ? 'scale-95' : ''}`}
            style={{
              transition: 'all 0.15s ease',
              transform: buttonPressed ? 'translateY(3px) scale(0.98)' : undefined,
              boxShadow: buttonPressed
                ? '0 2px 0 rgba(113, 90, 255, 0.3)'
                : '0 6px 0 rgba(113, 90, 255, 0.3), 0 4px 12px rgba(113, 90, 255, 0.2)',
            }}
          >
            Begin Your Story
          </button>
        )}

        {!ready && (
          <div className="flex flex-center gap-sm">
            <div className="loading-spinner" />
            <span className="text-body text-muted">Loading</span>
          </div>
        )}
      </div>

      {/* Footer text */}
      <p
        className={`text-small mt-lg ${showContent ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transition: 'opacity 0.5s ease 0.3s',
          color: 'var(--color-text-muted)',
        }}
      >
        An unfiltered life simulation experience
      </p>

      {/* Decorative bottom gradient */}
      <div
        className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(166, 130, 255, 0.08), transparent)',
        }}
      />
    </main>
  );
}
