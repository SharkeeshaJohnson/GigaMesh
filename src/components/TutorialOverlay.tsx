'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TutorialStep,
  getTutorialStepContent,
  getNextTutorialStep,
  setTutorialCompleted,
  getTutorialStepIndex,
  getTutorialTotalSteps,
} from '../lib/tutorial';

interface TutorialOverlayProps {
  onComplete: () => void;
  onStepChange?: (step: TutorialStep) => void;
  // External triggers for action-based steps
  npcClicked?: boolean;
  messageSent?: boolean;
  npcResponded?: boolean;
}

/**
 * Tutorial Overlay Component
 *
 * Renders a guided tutorial with spotlights on UI elements.
 * Steps progress through user actions or Next button clicks.
 */
export function TutorialOverlay({
  onComplete,
  onStepChange,
  npcClicked,
  messageSent,
  npcResponded,
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });

  // Drag state
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const stepContent = getTutorialStepContent(currentStep);
  const stepIndex = getTutorialStepIndex(currentStep);
  const totalSteps = getTutorialTotalSteps();

  // Update highlight position when step changes
  useEffect(() => {
    if (stepContent?.highlight) {
      const element = document.querySelector(`[data-tutorial="${stepContent.highlight}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);

        // Position tooltip near highlighted element
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // Default: below and centered
        let top = rect.bottom + 16;
        let left = rect.left + rect.width / 2 - 150; // 300px tooltip width / 2

        // If too low, position above
        if (top + 200 > windowHeight) {
          top = rect.top - 200 - 16;
        }

        // Keep within bounds
        left = Math.max(16, Math.min(left, windowWidth - 316));
        top = Math.max(16, top);

        setTooltipPosition({ top, left });
      } else {
        setHighlightRect(null);
        setTooltipPosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 150 });
      }
    } else {
      setHighlightRect(null);
      // Center tooltip when no highlight
      setTooltipPosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 150 });
    }
  }, [currentStep, stepContent]);

  // Handle step progression
  const advanceStep = useCallback(() => {
    const nextStep = getNextTutorialStep(currentStep);
    if (nextStep) {
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      // Tutorial complete
      setTutorialCompleted();
      onComplete();
    }
  }, [currentStep, onComplete, onStepChange]);

  // Auto-advance for action-based steps
  useEffect(() => {
    if (currentStep === 'select_npc' && npcClicked) {
      advanceStep();
    }
  }, [currentStep, npcClicked, advanceStep]);

  useEffect(() => {
    if (currentStep === 'send_message' && messageSent) {
      advanceStep();
    }
  }, [currentStep, messageSent, advanceStep]);

  useEffect(() => {
    if (currentStep === 'npc_response' && npcResponded) {
      // Small delay to let user see the response
      const timer = setTimeout(advanceStep, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, npcResponded, advanceStep]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Allow skipping tutorial
        setTutorialCompleted();
        onComplete();
      } else if (e.key === 'Enter' && stepContent?.action === 'next') {
        advanceStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepContent, advanceStep, onComplete]);

  // Reset drag offset when step changes (so tooltip repositions correctly)
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [currentStep]);

  // Handle drag events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setDragOffset({
        x: dragStartRef.current.offsetX + dx,
        y: dragStartRef.current.offsetY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!stepContent) return null;

  const showNextButton = stepContent.action === 'next' || stepContent.action === 'finish';
  const isWaitingForAction = stepContent.action === 'click-npc' ||
                              stepContent.action === 'send-message' ||
                              stepContent.action === 'wait-response';

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
      {/* Dark overlay with cutout for highlighted element */}
      <div
        className="absolute inset-0"
        style={{
          background: highlightRect
            ? `radial-gradient(ellipse ${highlightRect.width + 40}px ${highlightRect.height + 40}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, rgba(0,0,0,0.8) 100%)`
            : 'rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}
      />

      {/* Clickable area around highlight (pass through clicks to highlighted element) */}
      {highlightRect && (
        <div
          className="absolute"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            pointerEvents: 'none',
            border: '3px solid #ffcc00',
            borderRadius: '8px',
            boxShadow: '0 0 20px #ffcc00',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Tutorial tooltip */}
      <div
        className="absolute win95-window"
        style={{
          top: tooltipPosition.top + dragOffset.y,
          left: tooltipPosition.left + dragOffset.x,
          width: '300px',
          maxWidth: 'calc(100vw - 32px)',
          pointerEvents: 'auto',
          zIndex: 51,
        }}
      >
        <div
          className="win95-titlebar"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <span className="win95-titlebar-text">Tutorial ({stepIndex + 1}/{totalSteps})</span>
          <button
            onClick={() => {
              setTutorialCompleted();
              onComplete();
            }}
            className="win95-titlebar-btn"
            title="Skip Tutorial (Esc)"
          >
            ×
          </button>
        </div>

        <div className="p-3" style={{ background: 'var(--win95-light)' }}>
          {/* Step title */}
          <h3
            className="win95-text mb-2"
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'var(--win95-text)',
            }}
          >
            {stepContent.title}
          </h3>

          {/* Step content */}
          <p
            className="win95-text mb-2"
            style={{
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'var(--win95-text)',
            }}
          >
            {stepContent.content}
          </p>

          {/* Hint text (red and bold) */}
          {stepContent.hint && (
            <p
              className="win95-text mb-3"
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#cc0000',
              }}
            >
              {stepContent.hint}
            </p>
          )}

          {/* Suggested message for send_message step */}
          {stepContent.suggestedMessage && (
            <div
              className="mb-3 p-2"
              style={{
                background: 'var(--win95-lightest)',
                border: '1px solid var(--win95-border-dark)',
                fontSize: '11px',
                fontStyle: 'italic',
              }}
            >
              &quot;{stepContent.suggestedMessage}&quot;
            </div>
          )}

          {/* Progress bar */}
          <div
            className="mb-3"
            style={{
              height: '8px',
              background: 'var(--win95-mid)',
              border: '1px solid var(--win95-border-dark)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((stepIndex + 1) / totalSteps) * 100}%`,
                background: 'var(--win95-accent)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            {isWaitingForAction ? (
              <span
                className="win95-text"
                style={{
                  fontSize: '10px',
                  color: 'var(--win95-text-dim)',
                  fontStyle: 'italic',
                }}
              >
                {stepContent.action === 'click-npc' && 'Click on an NPC to continue...'}
                {stepContent.action === 'send-message' && 'Send a message to continue...'}
                {stepContent.action === 'wait-response' && 'Waiting for NPC response...'}
              </span>
            ) : (
              <span />
            )}

            {showNextButton && (
              <button
                onClick={() => {
                  if (stepContent.action === 'finish') {
                    setTutorialCompleted();
                    onComplete();
                  } else {
                    advanceStep();
                  }
                }}
                className="win95-btn px-4 py-1"
                style={{ fontSize: '12px' }}
              >
                {stepContent.action === 'finish' ? 'Start Playing!' : 'Next'}
              </button>
            )}
          </div>

          {/* Skip hint */}
          <p
            className="mt-2 text-center"
            style={{
              fontSize: '9px',
              color: 'var(--win95-text-dim)',
            }}
          >
            Press Esc to skip tutorial
          </p>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default TutorialOverlay;
