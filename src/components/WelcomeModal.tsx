import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { SafeImage } from './SafeImage';
import type { Lang, StoreSettings } from '../types';

interface WelcomeModalProps {
  lang: Lang;
  settings: StoreSettings;
  navigate: (path: string) => void;
  ready?: boolean;
}

const STORAGE_KEY = 'sep_welcome_seen_v1';

const COPY: Record<
  Lang,
  {
    kicker: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    dismissCta: string;
  }
> = {
  fr: {
    kicker: 'Casablanca, Maroc · Vos événements, notre expertise.',
    title: 'Bienvenue chez STRONG EVENT PRO',
    body: 'Mariages sur mesure, galas d’entreprise, conférences ou réceptions privées : découvrez nos prestations, demandez un devis détaillé en MAD ou réservez votre date en ligne.',
    primaryCta: 'Demander un devis',
    secondaryCta: 'Découvrir nos services',
    dismissCta: 'Explorer le site',
  },
  ar: {
    kicker: 'الدار البيضاء، المغرب · فعالياتكم، خبرتنا.',
    title: 'مرحباً بكم في STRONG EVENT PRO',
    body: 'حفلات زفاف، مؤتمرات مهنية أو استقبالات خاصة: اكتشفوا خدماتنا، اطلبوا عرض سعر مفصل بالدرهم المغربي أو احجزوا موعدكم عبر الإنترنت.',
    primaryCta: 'اطلب عرض سعر',
    secondaryCta: 'اكتشف خدماتنا',
    dismissCta: 'تصفح الموقع',
  },
  en: {
    kicker: 'Casablanca, Morocco · Your events, our expertise.',
    title: 'Welcome to STRONG EVENT PRO',
    body: 'Bespoke weddings, corporate galas, conferences, or private celebrations: explore our services, request a tailored MAD quote, or reserve your event date online.',
    primaryCta: 'Request a Quote',
    secondaryCta: 'Explore Services',
    dismissCta: 'Continue browsing',
  },
};

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ lang, settings, navigate, ready = true }) => {
  const [open, setOpen] = useState(false);
  const t = COPY[lang];

  useEffect(() => {
    if (!ready) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, [ready]);

  const handleClose = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const handleAction = (path: string) => {
    handleClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#111111]/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      onClick={handleClose}
    >
      <div
        className="bg-[#FAF9F6] text-[#111111] max-w-3xl w-full border border-[#C5A46D]/60 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:col-span-5 relative min-h-[200px] md:min-h-full bg-[#111111]">
          <SafeImage
            src={settings.heroImageUrl || '/src/assets/images/hero_luxury_gala_1795461362786.jpg'}
            alt="STRONG EVENT PRO — Réception à Casablanca"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/85 via-[#111111]/25 to-transparent" />
          <div className="absolute bottom-5 start-5 end-5">
            <BrandLogo variant="light" onClick={() => handleAction('/')} />
          </div>
        </div>

        <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-between gap-6 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 end-4 p-2 text-[#292929] hover:text-[#111111] hover:bg-[#E8DFD0] transition-colors cursor-pointer"
            aria-label="Fermer la fenêtre de bienvenue"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-4 pt-2">
            <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">{t.kicker}</p>
            <h2 id="welcome-modal-title" className="font-display text-3xl sm:text-4xl font-semibold text-[#111111] leading-tight text-balance">
              {t.title}
            </h2>
            <p className="text-sm text-[#292929] leading-relaxed">{t.body}</p>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#111111]/10">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleAction('/devis')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{t.primaryCta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAction('/services')}
                className="flex-1 inline-flex items-center justify-center px-5 py-3 border border-[#111111]/25 text-[#111111] text-xs font-medium hover:border-[#C5A46D] transition-colors whitespace-nowrap cursor-pointer"
              >
                {t.secondaryCta}
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-1.5 text-xs text-[#292929]/75 hover:text-[#111111] underline underline-offset-4 transition-colors cursor-pointer"
            >
              {t.dismissCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
