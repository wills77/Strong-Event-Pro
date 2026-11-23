import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1A1A] via-[#292929] to-[#111111] text-[#E8DFD0] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Calendar className="w-7 h-7 text-[#C5A46D] mb-2" strokeWidth={1.5} />
        <span className="font-display text-base tracking-wide text-[#FAF9F6] line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
