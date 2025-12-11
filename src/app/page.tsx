'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

// Character sprites for landing page carousel (using static PNGs - GIFs not available from PixelLab)
const HERO_SPRITES = [
  {
    id: 'doctor-male',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/046f0dc6-9ba6-4e4b-9204-aca8d60d8f3b/rotations/south.png'
  },
  {
    id: 'student-female',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/70a91e3d-0b5a-4547-85ef-0f63f8a045e3/rotations/south.png'
  },
  {
    id: 'black-woman',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/84b48e89-0ec8-4ead-bfa6-c4a724f8db77/rotations/south.png'
  },
  {
    id: 'dominatrix',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/2d3c6279-716c-4f2d-afa4-2d569d53d553/rotations/south.png'
  },
  {
    id: 'teacher-male',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/b66867ae-41a2-40e9-9ded-b931097bdc10/rotations/south.png'
  },
  {
    id: 'teacher-female',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/7c0fa009-320f-44d5-a03f-68d24a63c6e7/rotations/south.png'
  },
  {
    id: 'student-male',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/693033c5-4c49-4dba-b993-6662db2bf5b3/rotations/south.png'
  },
  {
    id: 'doctor-female',
    url: 'https://backblaze.pixellab.ai/file/pixellab-characters/0d64bd67-d677-43e0-8926-b89a45b8d74a/0a8fddc0-7319-4e8f-9c52-5cdcc096f72a/rotations/south.png'
  },
];

export default function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [titleText, setTitleText] = useState('');
  const [showContent, setShowContent] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/play');
    }
  }, [ready, authenticated, router]);

  // Typewriter effect for title
  useEffect(() => {
    if (!ready) return;

    const finalText = 'The Sprouts';
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

  return (
    <main className="landing-page">
      {/* Main Window - Windows 95 Style */}
      <div className="win95-window landing-window">
        {/* Title Bar */}
        <div className="win95-titlebar">
          <span className="win95-titlebar-text">The Sprouts</span>
          <div className="win95-titlebar-buttons">
            <button className="win95-titlebar-btn">_</button>
            <button className="win95-titlebar-btn">□</button>
            <button className="win95-titlebar-btn">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="win95-content landing-content">
          {/* Title with typewriter effect */}
          <h1 className="landing-title">
            {titleText}
            <span className="landing-cursor">_</span>
          </h1>

          {/* Tagline */}
          <p className="landing-tagline">
            The reality of the life you choose.
          </p>

          {/* Horizontal scrolling character showcase */}
          <div
            className={`landing-sprites-container ${showContent ? 'opacity-100' : 'opacity-0'}`}
            style={{ transition: 'opacity 0.5s ease' }}
          >
            <div ref={carouselRef} className="landing-sprites-carousel">
              {/* Duplicate sprites for seamless loop */}
              {[...HERO_SPRITES, ...HERO_SPRITES].map((sprite, index) => (
                <div key={`${sprite.id}-${index}`} className="landing-sprite-item">
                  <img
                    src={sprite.url}
                    alt={sprite.id}
                    className="sprite"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button - Windows 95 style */}
          <div className={`landing-cta ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            {ready && !authenticated && (
              <button
                onClick={() => login()}
                className="win95-btn win95-btn-lg"
                style={{
                  background: 'var(--win95-accent)',
                  color: 'white',
                  fontWeight: 'bold',
                  padding: '12px 32px',
                  fontSize: '18px',
                }}
              >
                Begin Your Story
              </button>
            )}

            {ready && authenticated && (
              <div className="flex flex-center gap-sm">
                <span className="win95-text win95-loading">Entering simulation</span>
              </div>
            )}

            {!ready && (
              <div className="flex flex-center gap-sm">
                <span className="win95-text win95-loading">Loading</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
