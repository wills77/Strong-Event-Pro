import React, { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  readyToExit: boolean;
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 10000;
const DRAW_DURATION_MS = 9500;
const CIRCLE_RADIUS = 146;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ readyToExit, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const readyRef = useRef(readyToExit);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    readyRef.current = readyToExit;
  }, [readyToExit]);

  useEffect(() => {
    let rafId = 0;
    let completed = false;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const drawRatio = Math.min(elapsed / DRAW_DURATION_MS, 1);
      // Smooth cubic ease-in-out progression across the 10s cycle
      const eased =
        drawRatio < 0.5
          ? 2 * drawRatio * drawRatio
          : 1 - Math.pow(-2 * drawRatio + 2, 2) / 2;

      setProgress(eased);

      if (elapsed >= DRAW_DURATION_MS && readyRef.current) {
        setExiting(true);
      }

      if (elapsed >= TOTAL_DURATION_MS && readyRef.current) {
        if (!completed) {
          completed = true;
          onCompleteRef.current();
        }
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
  const percentage = Math.round(progress * 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none transition-opacity duration-500 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #181613 0%, #0D0D0D 55%, #060606 100%)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Chargement de STRONG EVENT PRO"
    >
      <div className="relative w-[290px] h-[290px] sm:w-[350px] sm:h-[350px] flex items-center justify-center">
        <svg
          viewBox="0 0 320 320"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sep-gold-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E6CA94" />
              <stop offset="50%" stopColor="#C5A46D" />
              <stop offset="100%" stopColor="#9A7842" />
            </linearGradient>
          </defs>

          {/* Subtle outer champagne guide ring */}
          <circle
            cx="160"
            cy="160"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="rgba(197, 164, 109, 0.14)"
            strokeWidth="1.25"
          />

          {/* Delicate inner hairline ring */}
          <circle
            cx="160"
            cy="160"
            r="132"
            fill="none"
            stroke="rgba(197, 164, 109, 0.08)"
            strokeWidth="1"
          />

          {/* Progressive golden circle */}
          <circle
            cx="160"
            cy="160"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="url(#sep-gold-stroke)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 160 160)"
          />
        </svg>

        {/* Centered STRONG EVENT PRO logo */}
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <svg
            width="38"
            height="38"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="mb-3.5"
          >
            <rect x="1.5" y="1.5" width="33" height="33" stroke="#C5A46D" strokeWidth="1.4" />
            <path d="M18 6L29 18L18 30L7 18L18 6Z" stroke="#C5A46D" strokeWidth="1.2" />
            <circle cx="18" cy="18" r="2.8" fill="#C5A46D" />
          </svg>

          <span className="font-display text-xl sm:text-2xl font-semibold tracking-[0.14em] text-[#FAF9F6] leading-tight">
            STRONG EVENT PRO
          </span>

          <div className="w-10 h-px bg-[#C5A46D]/60 my-2.5" aria-hidden="true" />

          <span className="text-[11px] sm:text-xs text-[#C5A46D] tracking-[0.08em]">
            Vos événements, notre expertise.
          </span>

          <span className="mt-3 font-mono-num tabular-nums text-[11px] text-[#E8DFD0]/60 tracking-[0.16em]">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};
