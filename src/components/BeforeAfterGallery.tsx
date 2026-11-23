import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, MoveHorizontal } from 'lucide-react';
import { SafeImage } from './SafeImage';
import { TextReveal } from './TextReveal';

interface ComparisonScene {
  id: string;
  tabLabel: string;
  category: string;
  title: string;
  location: string;
  beforeLabel: string;
  afterLabel: string;
  beforeImage: string;
  afterImage: string;
  transformationNotes: string;
}

const SCENES: ComparisonScene[] = [
  {
    id: 'patio-mariage',
    tabLabel: '01. Patio de Mariage',
    category: 'Événement Privé · Décoration Florale',
    title: 'Patio Andalou — Du lieu brut à la table d’honneur',
    location: 'Casablanca · Exemple de scénographie',
    beforeLabel: 'Avant · Patio nu',
    afterLabel: 'Après · Mise en scène STRONG EVENT PRO',
    beforeImage: '/src/assets/images/before_wedding_patio_1795463577243.jpg',
    afterImage: '/src/assets/images/service_wedding_decor_1795461363397.jpg',
    transformationNotes:
      'Table impériale nappée lin ivoire, arche asymétrique d’orchidées Phalaenopsis et roses blanches, chandeliers en laiton et assises velours.',
  },
  {
    id: 'auditorium-corporate',
    tabLabel: '02. Auditorium Corporate',
    category: 'Événement Professionnel · Scénographie & Gala',
    title: 'Auditorium — De la salle vide au sommet exécutif',
    location: 'Casablanca · Exemple de scénographie',
    beforeLabel: 'Avant · Salle brute',
    afterLabel: 'Après · Production & Gala STRONG EVENT PRO',
    beforeImage: '/src/assets/images/before_corporate_auditorium_1795463577801.jpg',
    afterImage: '/src/assets/images/service_corporate_gala_1795461364781.jpg',
    transformationNotes:
      'Écrans LED panoramiques synchronisés, pupitre scénique, éclairage architectural chaud, tables rondes de gala et sonorisation complète.',
  },
];

interface BeforeAfterGalleryProps {
  navigate: (path: string) => void;
  compact?: boolean;
}

export const BeforeAfterGallery: React.FC<BeforeAfterGalleryProps> = ({
  navigate,
  compact = false,
}) => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [targetPercent, setTargetPercent] = useState(50);
  const [displayPercent, setDisplayPercent] = useState(50);
  const [velocity, setVelocity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverFollow, setHoverFollow] = useState(true);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(50);
  const displayRef = useRef(50);

  const scene = SCENES[sceneIdx];

  useEffect(() => {
    targetRef.current = targetPercent;
  }, [targetPercent]);

  // Smooth spring-damped interpolation for fluid reveal motion
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    const animate = () => {
      if (prefersReduced) {
        if (displayRef.current !== targetRef.current) {
          displayRef.current = targetRef.current;
          setDisplayPercent(targetRef.current);
          setVelocity(0);
        }
      } else {
        const diff = targetRef.current - displayRef.current;
        if (Math.abs(diff) > 0.05) {
          const next = displayRef.current + diff * 0.2;
          displayRef.current = next;
          setDisplayPercent(next);
          setVelocity(Math.min(Math.abs(diff) / 14, 1));
        } else if (displayRef.current !== targetRef.current) {
          displayRef.current = targetRef.current;
          setDisplayPercent(targetRef.current);
          setVelocity(0);
        }
      }
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const updateFromClientX = (clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, raw));
    setTargetPercent(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateFromClientX(e.clientX);
    } else if (hoverFollow && e.pointerType === 'mouse') {
      updateFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if pointer capture was not active
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setTargetPercent((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setTargetPercent((p) => Math.min(100, p + 5));
    }
  };

  const handleSceneChange = (index: number) => {
    setSceneIdx(index);
    setTargetPercent(50);
  };

  const beforeOpacity = Math.min(1, Math.max(0.25, displayPercent / 35));
  const afterOpacity = Math.min(1, Math.max(0.25, (100 - displayPercent) / 35));

  return (
    <div className={compact ? 'space-y-6' : 'space-y-8'}>
      {/* Section Heading & Scene Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#111111]/10 pb-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">
            Comparateur interactif · Avant & Après décoration
          </p>
          <TextReveal
            as="h2"
            tone="light"
            text="Métamorphose de Salles"
            className="font-display text-3xl md:text-4xl font-semibold"
          />
          <p className="text-sm text-[#292929] leading-relaxed">
            Déplacez le curseur sur l’image pour révéler la transformation complète d’un espace brut vers une scénographie signée STRONG EVENT PRO.
          </p>
        </div>

        {/* Scene switcher tabs */}
        <div className="flex flex-wrap gap-2">
          {SCENES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSceneChange(idx)}
              className={`px-4 py-2.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sceneIdx === idx
                  ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]'
                  : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15 hover:border-[#C5A46D]'
              }`}
            >
              {s.tabLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Main Comparison Stage */}
      <div className="bg-[#FAF9F6] border border-[#111111]/15 p-3 sm:p-5 space-y-5">
        <div
          ref={stageRef}
          dir="ltr"
          role="slider"
          tabIndex={0}
          aria-label={`Comparer ${scene.title} avant et après décoration`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayPercent)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative w-full aspect-[4/3] max-h-[620px] bg-[#111111] overflow-hidden select-none touch-none cursor-ew-resize focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A46D]"
        >
          {/* AFTER Image (Full-bleed base layer) */}
          <SafeImage
            src={scene.afterImage}
            alt={`${scene.title} — ${scene.afterLabel}`}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* BEFORE Image (Clipped smoothly by cursor position) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: `inset(0 ${100 - displayPercent}% 0 0)`,
              willChange: 'clip-path',
            }}
          >
            <SafeImage
              src={scene.beforeImage}
              alt={`${scene.title} — ${scene.beforeLabel}`}
              className="w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute inset-0 bg-[#111111]/10 pointer-events-none" />
          </div>

          {/* Corner Labels */}
          <div
            className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-[#111111]/85 text-[#FAF9F6] border border-[#FAF9F6]/20 text-[11px] font-medium tracking-wide pointer-events-none transition-opacity duration-200"
            style={{ opacity: beforeOpacity }}
          >
            {scene.beforeLabel}
          </div>
          <div
            className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-[#111111]/90 text-[#C5A46D] border border-[#C5A46D]/50 text-[11px] font-semibold tracking-wide pointer-events-none transition-opacity duration-200"
            style={{ opacity: afterOpacity }}
          >
            {scene.afterLabel}
          </div>

          {/* Golden Reveal Aura + Seam Line */}
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: `${displayPercent}%` }}
          >
            {/* Soft golden illumination veil during cursor movement */}
            <div
              className="absolute top-0 bottom-0 -translate-x-1/2 w-20 transition-opacity duration-200"
              style={{
                opacity: 0.28 + velocity * 0.55,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(197, 164, 109, 0.32) 50%, transparent 100%)',
              }}
            />

            {/* Crisp champagne-gold divider line */}
            <div
              className="absolute top-0 bottom-0 -translate-x-1/2 w-[2px]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(197,164,109,0.25) 0%, #EBD3A2 30%, #C5A46D 70%, rgba(197,164,109,0.25) 100%)',
                boxShadow: '0 0 18px rgba(197, 164, 109, 0.55)',
              }}
            />

            {/* Interactive center handle */}
            <div
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#111111] border-2 border-[#C5A46D] text-[#C5A46D] flex items-center justify-center shadow-2xl transition-transform duration-150 ${
                isDragging ? 'scale-110 bg-[#C5A46D] text-[#111111]' : ''
              }`}
            >
              <MoveHorizontal className="w-4 h-4" />
            </div>
          </div>

          {/* Bottom live percentage indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-[#111111]/80 border border-[#C5A46D]/35 text-[11px] font-mono-num tabular-nums text-[#FAF9F6] pointer-events-none whitespace-nowrap">
            Avant {Math.round(displayPercent)}% · Après {Math.round(100 - displayPercent)}%
          </div>
        </div>

        {/* Footer Controls & Architectural Transformation Details */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1 max-w-2xl">
            <div className="text-xs text-[#C5A46D] font-medium">
              {scene.category} · {scene.location}
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#111111]">{scene.title}</h3>
            <p className="text-xs sm:text-sm text-[#292929] leading-relaxed">
              {scene.transformationNotes}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHoverFollow((v) => !v)}
              className={`px-3 py-2 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                hoverFollow
                  ? 'bg-[#E8DFD0]/70 border-[#C5A46D] text-[#111111]'
                  : 'bg-white border-[#111111]/20 text-[#292929]'
              }`}
            >
              {hoverFollow ? 'Curseur : Suivi fluide' : 'Curseur : Glisser'}
            </button>
            <div className="inline-flex border border-[#111111]/15 bg-white">
              {[
                { label: 'Avant', value: 100 },
                { label: '50/50', value: 50 },
                { label: 'Après', value: 0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTargetPercent(preset.value)}
                  className="px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#111111] hover:text-[#FAF9F6] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/devis')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Devis scénographie</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
