'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Identity, MAX_SAVE_SLOTS } from '@/lib/types';
import { getAllIdentities } from '@/lib/indexeddb';

interface SaveSlot {
  index: number;
  identity: Identity | null;
}

export default function SaveSlotPage() {
  const { authenticated, ready, logout } = usePrivy();
  const router = useRouter();
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function loadSlots() {
      try {
        const identities = await getAllIdentities();
        const slotArray: SaveSlot[] = [];

        for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
          const identity = identities.find((id) => id.slotIndex === i) || null;
          slotArray.push({ index: i, identity });
        }

        setSlots(slotArray);
      } catch (error) {
        console.error('Failed to load save slots:', error);
      } finally {
        setLoading(false);
      }
    }

    if (authenticated) {
      loadSlots();
    }
  }, [authenticated]);

  const handleSlotClick = (slot: SaveSlot) => {
    if (slot.identity) {
      router.push(`/play/${slot.identity.id}`);
    } else {
      router.push(`/create?slot=${slot.index}`);
    }
  };

  if (!ready || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--pixel-bg-dark)]">
        <div className="pixel-text text-[var(--pixel-text-dim)]">
          <span className="pixel-loading">Loading saves</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--pixel-bg-dark)] relative">
      {/* Scanline overlay */}
      <div className="pixel-scanline" />

      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(var(--pixel-border) 1px, transparent 1px),
              linear-gradient(90deg, var(--pixel-border) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="max-w-4xl w-full relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="pixel-title text-[var(--pixel-gold)] mb-2">SELECT SAVE</h1>
            <p className="pixel-text-small text-[var(--pixel-text-dim)]">Choose a life to continue or start anew</p>
          </div>
          <button onClick={logout} className="pixel-btn text-xs">
            LOG OUT
          </button>
        </div>

        {/* Save slots grid */}
        <div className="grid grid-cols-2 gap-6">
          {slots.map((slot, idx) => {
            const allEmpty = slots.every(s => !s.identity);
            const isFirstEmptySlot = allEmpty && idx === 0;

            return (
              <button
                key={slot.index}
                onClick={() => handleSlotClick(slot)}
                className={`pixel-frame text-left min-h-[200px] flex flex-col relative transition-all hover:scale-[1.02] hover:border-[var(--pixel-gold)] ${
                  isFirstEmptySlot ? 'border-[var(--pixel-gold)] animate-pulse' : ''
                }`}
              >
                {isFirstEmptySlot && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 pixel-label text-[var(--pixel-gold)] text-xs whitespace-nowrap animate-bounce">
                    &gt;&gt; START HERE &lt;&lt;
                  </div>
                )}

                {/* Slot number badge */}
                <div className="absolute -top-3 -left-1 bg-[var(--pixel-surface)] border-2 border-[var(--pixel-border)] px-3 py-1">
                  <span className="pixel-label text-[var(--pixel-text-dim)]">SLOT {slot.index + 1}</span>
                </div>

                {slot.identity ? (
                  <div className="pt-4 flex flex-col h-full">
                    {/* Character name */}
                    <h2 className="pixel-title text-lg text-[var(--pixel-parchment)] mb-3">
                      {slot.identity.name}
                    </h2>

                    {/* Stats */}
                    <div className="pixel-frame-inset p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="pixel-label text-[var(--pixel-text-dim)] w-16">CLASS:</span>
                        <span className="pixel-text text-[var(--pixel-text)]">{slot.identity.scenario.profession}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="pixel-label text-[var(--pixel-text-dim)] w-16">DAY:</span>
                        <span className="pixel-text text-[var(--pixel-gold)]">{slot.identity.currentDay}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="pixel-label text-[var(--pixel-text-dim)] w-16">MODE:</span>
                        <span className={`pixel-text uppercase ${
                          slot.identity.difficulty === 'hard' ? 'text-[var(--pixel-red)]' :
                          slot.identity.difficulty === 'medium' ? 'text-[var(--pixel-gold)]' :
                          'text-[var(--pixel-green)]'
                        }`}>
                          {slot.identity.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Bottom tags */}
                    <div className="mt-auto flex gap-2">
                      <span className="pixel-tag">
                        {slot.identity.npcs.length} NPCs
                      </span>
                      <span className="pixel-tag">
                        {slot.identity.persona || (slot.identity.gender === 'male' ? '♂ MALE' : '♀ FEMALE')}
                      </span>
                    </div>

                    {/* Continue indicator */}
                    <div className="absolute bottom-3 right-3 pixel-label text-[var(--pixel-green)] animate-pulse">
                      &gt; CONTINUE
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center pt-4">
                    <div className="pixel-title text-4xl text-[var(--pixel-text-dim)] mb-3">+</div>
                    <div className="pixel-label text-[var(--pixel-text-dim)]">EMPTY SLOT</div>
                    <div className="pixel-text-small text-[var(--pixel-text-dim)] mt-2">Click to begin</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-8 text-center">
          <p className="pixel-text-small text-[var(--pixel-text-dim)]">
            Each slot is a separate life with its own choices and consequences
          </p>
        </div>
      </div>
    </main>
  );
}
