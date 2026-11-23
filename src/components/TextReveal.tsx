import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const TextRevealReadyContext = createContext<boolean>(true);

export const TextRevealProvider: React.FC<{ ready: boolean; children: React.ReactNode }> = ({
  ready,
  children,
}) => {
  return (
    <TextRevealReadyContext.Provider value={ready}>{children}</TextRevealReadyContext.Provider>
  );
};

interface TextRevealProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  tone?: 'dark' | 'light';
  className?: string;
  staggerMs?: number;
  delayMs?: number;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  as: Tag = 'h2',
  tone = 'light',
  className = '',
  staggerMs = 65,
  delayMs = 0,
}) => {
  const appReady = useContext(TextRevealReadyContext);
  const hostRef = useRef<HTMLHeadingElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -4% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const active = appReady && inView;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const gradientClass = tone === 'dark' ? 'sep-gold-text-dark' : 'sep-gold-text-light';

  return (
    <Tag
      ref={hostRef}
      aria-label={text}
      className={`${className} text-balance`}
    >
      {words.map((word, index) => (
        <React.Fragment key={`${text}-${index}-${word}`}>
          <span
            aria-hidden="true"
            className="inline-block overflow-hidden align-bottom pb-[0.1em] -mb-[0.1em]"
          >
            <span
              className={`inline-block ${gradientClass} ${
                active ? 'sep-word-revealed' : 'sep-word-hidden'
              }`}
              style={{
                animationDelay: active ? `${delayMs + index * staggerMs}ms` : undefined,
              }}
            >
              {word}
            </span>
          </span>
          {index < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </Tag>
  );
};
