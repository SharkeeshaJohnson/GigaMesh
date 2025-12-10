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

export default function PlayPage() {
  const { authenticated, ready, logout } = usePrivy();
  const router = useRouter();
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

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
    setSelectedSlot(slot.index);
  };

  const handleSlotDoubleClick = (slot: SaveSlot) => {
    if (slot.identity) {
      router.push(`/play/${slot.identity.id}`);
    } else {
      router.push(`/create?slot=${slot.index}`);
    }
  };

  const handleOpen = () => {
    if (selectedSlot === null) return;
    const slot = slots[selectedSlot];
    if (slot.identity) {
      router.push(`/play/${slot.identity.id}`);
    } else {
      router.push(`/create?slot=${slot.index}`);
    }
  };

  if (!ready || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="win95-window p-8">
          <span className="win95-text win95-loading">Loading saves</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      {/* Main Window */}
      <div className="win95-window w-full max-w-3xl">
        {/* Title Bar */}
        <div className="win95-titlebar">
          <span className="win95-titlebar-text">Sprouts - Save Files</span>
          <div className="win95-titlebar-buttons">
            <button className="win95-titlebar-btn">_</button>
            <button className="win95-titlebar-btn">□</button>
            <button className="win95-titlebar-btn" onClick={logout}>×</button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="win95-menubar">
          <span className="win95-menu-item"><u>F</u>ile</span>
          <span className="win95-menu-item"><u>E</u>dit</span>
          <span className="win95-menu-item"><u>V</u>iew</span>
          <span className="win95-menu-item"><u>H</u>elp</span>
        </div>

        {/* Toolbar */}
        <div className="win95-toolbar">
          <button className="win95-btn win95-btn-sm" onClick={handleOpen} disabled={selectedSlot === null}>
            Open
          </button>
          <div className="win95-toolbar-separator" />
          <button className="win95-btn win95-btn-sm" onClick={logout}>
            Log Out
          </button>
        </div>

        {/* Content - Save Slots Grid */}
        <div className="win95-content" style={{ minHeight: '400px' }}>
          {/* Address bar style header */}
          <div className="win95-panel-inset mb-4 p-2 flex items-center gap-2">
            <span className="win95-text-sm" style={{ color: 'var(--win95-text-dim)' }}>Location:</span>
            <span className="win95-text">C:\Sprouts\Saves\</span>
          </div>

          {/* Slots Grid - Icon View Style */}
          <div className="win95-panel-inset p-4" style={{ background: 'white', minHeight: '300px' }}>
            <div className="grid grid-cols-4 gap-4">
              {slots.map((slot) => (
                <button
                  key={slot.index}
                  onClick={() => handleSlotClick(slot)}
                  onDoubleClick={() => handleSlotDoubleClick(slot)}
                  className={`flex flex-col items-center p-3 transition-colors ${
                    selectedSlot === slot.index
                      ? 'bg-[var(--win95-title-active)]'
                      : 'hover:bg-[var(--win95-lightest)]'
                  }`}
                  style={{
                    border: 'none',
                    background: selectedSlot === slot.index ? 'var(--win95-title-active)' : 'transparent',
                    outline: selectedSlot === slot.index ? '1px dotted white' : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 mb-2 flex items-center justify-center text-2xl"
                    style={{
                      background: slot.identity
                        ? 'linear-gradient(180deg, var(--win95-lightest) 0%, var(--win95-light) 100%)'
                        : 'var(--win95-mid)',
                      border: '2px solid var(--win95-border-dark)',
                    }}
                  >
                    {slot.identity ? (
                      slot.identity.pixelArtUrl ? (
                        <img
                          src={slot.identity.pixelArtUrl}
                          alt={slot.identity.name}
                          className="w-10 h-10 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        '👤'
                      )
                    ) : (
                      <span style={{ color: 'var(--win95-text-dim)' }}>+</span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="text-center text-sm leading-tight"
                    style={{
                      color: selectedSlot === slot.index ? 'white' : 'var(--win95-text)',
                      fontFamily: "'VT323', monospace",
                      fontSize: '16px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {slot.identity ? (
                      <>
                        {slot.identity.name}
                        <br />
                        <span style={{ fontSize: '14px', opacity: 0.8 }}>
                          Day {slot.identity.currentDay}
                        </span>
                      </>
                    ) : (
                      <>
                        Slot {slot.index + 1}
                        <br />
                        <span style={{ fontSize: '14px', opacity: 0.7 }}>(Empty)</span>
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          {selectedSlot !== null && (
            <div className="win95-groupbox mt-4">
              <span className="win95-groupbox-label">Details</span>
              <div className="grid grid-cols-2 gap-4">
                {slots[selectedSlot].identity ? (
                  <>
                    <div>
                      <span className="win95-label">Name:</span>
                      <span className="win95-text">{slots[selectedSlot].identity!.name}</span>
                    </div>
                    <div>
                      <span className="win95-label">Profession:</span>
                      <span className="win95-text">{slots[selectedSlot].identity!.scenario.profession}</span>
                    </div>
                    <div>
                      <span className="win95-label">Day:</span>
                      <span className="win95-text">{slots[selectedSlot].identity!.currentDay}</span>
                    </div>
                    <div>
                      <span className="win95-label">NPCs:</span>
                      <span className="win95-text">{slots[selectedSlot].identity!.npcs.length} characters</span>
                    </div>
                    <div>
                      <span className="win95-label">Difficulty:</span>
                      <span className="win95-text" style={{ textTransform: 'capitalize' }}>
                        {slots[selectedSlot].identity!.difficulty}
                      </span>
                    </div>
                    <div>
                      <span className="win95-label">Mode:</span>
                      <span className="win95-text" style={{ textTransform: 'capitalize' }}>
                        {slots[selectedSlot].identity!.persona?.replace(/-/g, ' ') || 'Default'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <span className="win95-text" style={{ color: 'var(--win95-text-dim)' }}>
                      Empty save slot. Double-click to create a new character.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="win95-statusbar">
          <div className="win95-statusbar-section">
            {selectedSlot !== null
              ? slots[selectedSlot].identity
                ? `Selected: ${slots[selectedSlot].identity!.name}`
                : 'Selected: Empty Slot'
              : 'Select a save slot'}
          </div>
          <div className="win95-statusbar-section" style={{ flex: '0 0 auto', width: '120px' }}>
            {slots.filter(s => s.identity).length} of {MAX_SAVE_SLOTS} slots
          </div>
        </div>
      </div>
    </main>
  );
}
