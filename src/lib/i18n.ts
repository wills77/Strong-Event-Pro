import type { Lang } from '../types';

export function formatMad(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Sur devis';
  return `${Number(amount).toLocaleString('fr-FR')} MAD`;
}

export const TRANSLATIONS: Record<
  Lang,
  {
    nav: {
      home: string;
      services: string;
      events: string;
      portfolio: string;
      providers: string;
      about: string;
      contact: string;
      book: string;
      quote: string;
      news: string;
      clientArea: string;
      admin: string;
    };
    hero: {
      location: string;
      title: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
    };
    sections: {
      expertiseTitle: string;
      expertiseSub: string;
      servicesTitle: string;
      packagesTitle: string;
      portfolioTitle: string;
      whyTitle: string;
      howTitle: string;
      testimonialsTitle: string;
      quickQuoteTitle: string;
      newsletterTitle: string;
    };
  }
> = {
  fr: {
    nav: {
      home: 'Accueil',
      services: 'Services',
      events: 'Événements',
      portfolio: 'Réalisations',
      providers: 'Prestataires',
      about: 'À propos',
      contact: 'Contact',
      book: 'Réserver un événement',
      quote: 'Demander un devis',
      news: 'Actualités & conseils',
      clientArea: 'Espace client',
      admin: 'Administration',
    },
    hero: {
      location: 'Casablanca, Maroc',
      title: 'Créons ensemble des événements inoubliables.',
      subtitle:
        'De la conception à la réalisation, STRONG EVENT PRO transforme vos idées en expériences exceptionnelles.',
      ctaPrimary: 'Organiser mon événement',
      ctaSecondary: 'Découvrir nos services',
    },
    sections: {
      expertiseTitle: "Nos domaines d'expertise",
      expertiseSub:
        'Réceptions privées, sommets corporate et célébrations d’envergure orchestrés sur mesure à Casablanca.',
      servicesTitle: 'Nos prestations événementielles',
      packagesTitle: 'Nos formules & packages',
      portfolioTitle: 'Nos réalisations',
      whyTitle: 'Pourquoi choisir STRONG EVENT PRO ?',
      howTitle: 'Comment ça fonctionne ?',
      testimonialsTitle: 'Témoignages clients',
      quickQuoteTitle: 'Demande de devis rapide',
      newsletterTitle: 'Restez informé de nos actualités',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      services: 'خدماتنا',
      events: 'الفعاليات',
      portfolio: 'إنجازاتنا',
      providers: 'المزودون',
      about: 'من نحن',
      contact: 'اتصل بنا',
      book: 'احجز فعالية',
      quote: 'اطلب عرض سعر',
      news: 'أخبار ونصائح',
      clientArea: 'فضاء العميل',
      admin: 'الإدارة',
    },
    hero: {
      location: 'الدار البيضاء، المغرب',
      title: 'لنصنع معاً فعاليات لا تُنسى.',
      subtitle:
        'من التصميم إلى التنفيذ، تحوّل STRONG EVENT PRO أفكاركم إلى تجارب استثنائية.',
      ctaPrimary: 'نظّم فعاليتك',
      ctaSecondary: 'اكتشف خدماتنا',
    },
    sections: {
      expertiseTitle: 'مجالات خبرتنا',
      expertiseSub:
        'حفلات خاصة، مؤتمرات مهنية، واحتفالات كبرى مصممة حسب الطلب في الدار البيضاء.',
      servicesTitle: 'خدماتنا التنظيمية',
      packagesTitle: 'باقاتنا وعروضنا',
      portfolioTitle: 'معرض الإنجازات',
      whyTitle: 'لماذا STRONG EVENT PRO؟',
      howTitle: 'كيف نعمل؟',
      testimonialsTitle: 'آراء العملاء',
      quickQuoteTitle: 'طلب عرض سعر سريع',
      newsletterTitle: 'اشترك في نشرتنا الإخبارية',
    },
  },
  en: {
    nav: {
      home: 'Home',
      services: 'Services',
      events: 'Events',
      portfolio: 'Portfolio',
      providers: 'Providers',
      about: 'About',
      contact: 'Contact',
      book: 'Book an Event',
      quote: 'Request a Quote',
      news: 'News & Tips',
      clientArea: 'Client Portal',
      admin: 'Admin',
    },
    hero: {
      location: 'Casablanca, Morocco',
      title: 'Let us craft unforgettable events together.',
      subtitle:
        'From concept to production, STRONG EVENT PRO transforms your vision into exceptional experiences.',
      ctaPrimary: 'Plan my event',
      ctaSecondary: 'Explore services',
    },
    sections: {
      expertiseTitle: 'Areas of Expertise',
      expertiseSub:
        'Private celebrations, executive summits, and large-scale productions tailored in Casablanca.',
      servicesTitle: 'Event Services',
      packagesTitle: 'Packages & Tiers',
      portfolioTitle: 'Selected Works',
      whyTitle: 'Why Choose STRONG EVENT PRO?',
      howTitle: 'How It Works',
      testimonialsTitle: 'Client Testimonials',
      quickQuoteTitle: 'Quick Quote Request',
      newsletterTitle: 'Newsletter',
    },
  },
};
