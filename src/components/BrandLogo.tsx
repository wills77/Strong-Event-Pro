import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'dark', onClick }) => {
  const textColor = variant === 'light' ? 'text-[#FAF9F6]' : 'text-[#111111]';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A46D] cursor-pointer"
      aria-label="STRONG EVENT PRO — Accueil"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1.5" y="1.5" width="33" height="33" stroke="#C5A46D" strokeWidth="1.5" />
        <path d="M18 6L29 18L18 30L7 18L18 6Z" stroke="#C5A46D" strokeWidth="1.25" />
        <circle cx="18" cy="18" r="3" fill="#C5A46D" />
      </svg>
      <span className={`font-display text-xl font-semibold tracking-[0.06em] ${textColor} whitespace-nowrap`}>
        STRONG EVENT PRO
      </span>
    </button>
  );
};
