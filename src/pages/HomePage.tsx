import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { BeforeAfterGallery } from '../components/BeforeAfterGallery';
import { TextReveal } from '../components/TextReveal';
import { formatMad, TRANSLATIONS } from '../lib/i18n';
import type {
  EventCategory,
  Lang,
  PortfolioItem,
  ReviewItem,
  ServiceItem,
  ServicePackage,
  StoreSettings,
} from '../types';

interface HomePageProps {
  lang: Lang;
  settings: StoreSettings;
  categories: EventCategory[];
  services: ServiceItem[];
  packages: ServicePackage[];
  portfolio: PortfolioItem[];
  reviews: ReviewItem[];
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  lang,
  settings,
  categories,
  services,
  packages,
  portfolio,
  reviews,
  navigate,
}) => {
  const t = TRANSLATIONS[lang];

  // Quick Quote Form state
  const [quickQuote, setQuickQuote] = useState({
    eventType: 'Mariages',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventDate: '',
    guestCount: 100,
    estimatedBudgetMad: settings.budgetRanges[1] || '30 000 – 80 000 MAD',
    projectDescription: '',
  });
  const [quoteStatus, setQuoteStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string; reference?: string }>({
    type: 'idle',
  });

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  const handleQuickQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteStatus({ type: 'loading' });
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quickQuote,
          city: 'Casablanca',
          selectedServices: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteStatus({ type: 'error', message: data.error || 'Erreur lors de l’envoi.' });
        return;
      }
      setQuoteStatus({
        type: 'success',
        reference: data.reference,
        message: 'Votre demande a été enregistrée. Notre équipe à Casablanca vous répondra sous 24 à 48h.',
      });
      setQuickQuote((prev) => ({
        ...prev,
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        eventDate: '',
        projectDescription: '',
      }));
    } catch {
      setQuoteStatus({ type: 'error', message: 'Impossible de joindre le serveur.' });
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterStatus({ type: 'loading' });
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsletterStatus({ type: 'error', message: data.error || 'E-mail invalide.' });
        return;
      }
      setNewsletterStatus({ type: 'success', message: data.message });
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus({ type: 'error', message: 'Erreur réseau.' });
    }
  };

  const expertiseGroups = [
    {
      num: '01',
      title: 'Événements Privés',
      desc: 'Mariages, fiançailles, anniversaires, baptêmes, baby showers et réceptions familiales sur mesure.',
      items: categories.filter((c) => c.groupName === 'Événements Privés').slice(0, 4),
      img: '/src/assets/images/service_wedding_decor_1795461363397.jpg',
    },
    {
      num: '02',
      title: 'Événements Professionnels',
      desc: 'Séminaires, conférences, congrès, galas, lancements de produits et soirées d’entreprise.',
      items: categories.filter((c) => c.groupName === 'Événements Professionnels').slice(0, 4),
      img: '/src/assets/images/service_corporate_gala_1795461364781.jpg',
    },
    {
      num: '03',
      title: 'Événements Festifs',
      desc: 'Concerts, festivals, soirées VIP, événements musicaux et fêtes thématiques immersives.',
      items: categories.filter((c) => c.groupName === 'Événements Festifs').slice(0, 4),
      img: '/src/assets/images/service_sound_lighting_1795461365759.jpg',
    },
  ];

  const pillars = [
    { num: '01', title: 'Accompagnement personnalisé', text: 'Un chef de projet dédié vous guide de l’idée initiale jusqu’à la clôture de l’événement.' },
    { num: '02', title: 'Professionnalisme', text: 'Engagements contractuels clairs, ponctualité et maîtrise des protocoles privés et corporate.' },
    { num: '03', title: 'Créativité scénographique', text: 'Univers visuels sur mesure alliant architecture contemporaine et savoir-faire marocain.' },
    { num: '04', title: 'Organisation rigoureuse', text: 'Conducteur minuté, checklists techniques et coordination terrain sans faille.' },
    { num: '05', title: 'Réseau de prestataires vérifiés', text: 'Traiteurs, décorateurs, musiciens et régisseurs sélectionnés et validés à Casablanca.' },
    { num: '06', title: 'Gestion transparente du budget', text: 'Devis détaillés ligne par ligne en MAD avec suivi des acomptes et du solde en ligne.' },
    { num: '07', title: 'Suivi en temps réel', text: 'Tableau de bord client sécurisé pour consulter devis, étapes d’avancement et documents.' },
  ];

  const workflowSteps = [
    { step: '01', title: 'Vous décrivez votre projet', desc: 'Via notre formulaire intelligent de devis ou directement lors d’une demande de réservation.' },
    { step: '02', title: 'Notre équipe étudie le besoin', desc: 'Vérification des disponibilités, repérage technique et sélection des prestataires adaptés.' },
    { step: '03', title: 'Proposition & devis en MAD', desc: 'Vous recevez un chiffrage détaillé, consultable et validable depuis votre espace client.' },
    { step: '04', title: 'Organisation & réalisation', desc: 'Planification en 7 étapes jusqu’à l’installation et la coordination le jour J.' },
  ];

  return (
    <div>
      {/* 1. Immersive Luxury Hero */}
      <section className="relative bg-[#111111] text-[#FAF9F6] overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage
            src={settings.heroImageUrl}
            alt="Réception de gala STRONG EVENT PRO à Casablanca"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/65 to-[#111111]/40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-36 lg:py-44">
          <div className="max-w-3xl space-y-6">
            <p className="text-xs md:text-sm tracking-[0.18em] text-[#C5A46D] font-medium">
              {t.hero.location} · {settings.slogan}
            </p>
            <TextReveal
              as="h1"
              tone="dark"
              text={settings.heroTitle || t.hero.title}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08]"
              staggerMs={70}
            />
            <p className="text-base md:text-lg text-[#E8DFD0] leading-relaxed max-w-2xl">
              {settings.heroSubtitle || t.hero.subtitle}
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/reserver')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold bg-[#C5A46D] text-[#111111] hover:bg-[#FAF9F6] transition-colors duration-200 ease-luxury whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.hero.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/services')}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium border border-[#FAF9F6]/40 text-[#FAF9F6] hover:border-[#C5A46D] hover:text-[#C5A46D] transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.hero.ctaSecondary}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/devis')}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-[#E8DFD0] hover:text-[#C5A46D] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.nav.quote}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* A. Nos domaines d'expertise */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-[#111111]/10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Catalogue d’événements</p>
            <TextReveal as="h2" tone="light" text={t.sections.expertiseTitle} className="font-display text-3xl md:text-4xl font-semibold" />
            <p className="text-sm md:text-base text-[#292929]">{t.sections.expertiseSub}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/evenements')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#111111] hover:text-[#C5A46D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Voir les 22 catégories</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {expertiseGroups.map((group) => (
            <article
              key={group.num}
              className="group bg-[#FAF9F6] border border-[#111111]/10 flex flex-col overflow-hidden hover:border-[#C5A46D] transition-colors duration-200"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#111111]">
                <SafeImage
                  src={group.img}
                  alt={group.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-luxury"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="text-xs font-mono-num text-[#C5A46D]">{group.num}.</div>
                  <h3 className="font-display text-2xl font-semibold text-[#111111]">{group.title}</h3>
                  <p className="text-sm text-[#292929] leading-relaxed">{group.desc}</p>
                </div>
                <div className="pt-4 border-t border-[#111111]/10 space-y-3">
                  <div className="text-xs text-[#292929]/80 leading-relaxed">
                    {group.items.map((c) => c.name).join(' · ')}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/evenements')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-[#C5A46D] transition-colors cursor-pointer"
                  >
                    <span>Explorer la catégorie</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* B. Nos services & Formules */}
      <section className="bg-[#E8DFD0]/45 border-y border-[#111111]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">6 Pôles métiers</p>
              <TextReveal as="h2" tone="light" text={t.sections.servicesTitle} className="font-display text-3xl md:text-4xl font-semibold" />
            </div>
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#111111] hover:text-[#C5A46D] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Catalogue complet ({services.length} prestations)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {services.slice(0, 6).map((srv) => (
              <div
                key={srv.id}
                onClick={() => navigate('/services')}
                className="bg-[#FAF9F6] border border-[#111111]/10 p-6 flex flex-col justify-between gap-4 hover:border-[#C5A46D] transition-colors cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="text-xs text-[#292929]/75 flex items-center gap-2">
                    <span>{srv.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-[#111111] font-medium">{srv.priceLabel}</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-[#111111]">{srv.name}</h3>
                  <p className="text-sm text-[#292929] leading-relaxed line-clamp-3">{srv.description}</p>
                </div>
                <div className="pt-3 border-t border-[#111111]/10 flex items-center justify-between text-xs font-medium text-[#111111]">
                  <span>{srv.duration}</span>
                  <span className="text-[#C5A46D] inline-flex items-center gap-1">
                    Détails <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 4 Packages Preview */}
          <div className="pt-8 border-t border-[#111111]/10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Accompagnement clé en main</p>
                <h3 className="font-display text-2xl md:text-3xl font-semibold">{t.sections.packagesTitle}</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`p-6 border flex flex-col justify-between gap-6 ${
                    pkg.slug === 'pack-prestige'
                      ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]'
                      : 'bg-[#FAF9F6] text-[#111111] border-[#111111]/15'
                  }`}
                >
                  <div className="space-y-3">
                    <h4 className="font-display text-xl font-semibold tracking-wide text-[#C5A46D]">{pkg.name}</h4>
                    <p className={`text-xs ${pkg.slug === 'pack-prestige' ? 'text-[#E8DFD0]/80' : 'text-[#292929]'}`}>
                      {pkg.subtitle}
                    </p>
                    <p className="font-mono-num text-xl font-semibold pt-1">
                      {formatMad(pkg.indicativePriceMad)}
                    </p>
                    <ul className="space-y-2 pt-3 border-t border-current/10 text-xs leading-relaxed">
                      {pkg.includedItems.slice(0, 4).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#C5A46D] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(pkg.indicativePriceMad ? '/reserver' : '/devis')}
                    className={`w-full py-2.5 px-4 text-xs font-semibold transition-colors cursor-pointer ${
                      pkg.slug === 'pack-prestige'
                        ? 'bg-[#C5A46D] text-[#111111] hover:bg-[#FAF9F6]'
                        : 'bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111]'
                    }`}
                  >
                    {pkg.indicativePriceMad ? 'Réserver cette formule' : 'Demander un devis'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* C. Nos réalisations (Demo Showcase clearly labeled) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Portfolio & Scénographies (Exemples de démonstration)</p>
            <TextReveal as="h2" tone="light" text={t.sections.portfolioTitle} className="font-display text-3xl md:text-4xl font-semibold" />
          </div>
          <button
            type="button"
            onClick={() => navigate('/realisations')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#111111] hover:text-[#C5A46D] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Voir toute la galerie</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {portfolio.slice(0, 6).map((item) => (
            <article
              key={item.id}
              onClick={() => navigate('/realisations')}
              className="group border border-[#111111]/10 bg-[#FAF9F6] overflow-hidden hover:border-[#C5A46D] transition-colors cursor-pointer"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#111111]">
                <SafeImage
                  src={item.galleryUrls[0] || ''}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-luxury"
                />
              </div>
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#292929]/75">
                  <span>{item.eventType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.city}</span>
                  {item.isDemo && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#C5A46D] font-medium">Démonstration</span>
                    </>
                  )}
                </div>
                <h3 className="font-display text-xl font-semibold text-[#111111]">{item.title}</h3>
                <p className="text-sm text-[#292929] line-clamp-2">{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 pt-14 border-t border-[#111111]/10">
          <BeforeAfterGallery navigate={navigate} />
        </div>
      </section>

      {/* D & E. Pourquoi nous choisir & Comment ça fonctionne */}
      <section className="bg-[#111111] text-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-14">
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Engagements STRONG EVENT PRO</p>
              <TextReveal as="h2" tone="dark" text={t.sections.whyTitle} className="font-display text-3xl md:text-4xl font-semibold" />
            </div>
            <div className="divide-y divide-[#FAF9F6]/10 border-t border-b border-[#FAF9F6]/10">
              {pillars.map((p) => (
                <div key={p.num} className="py-4 grid grid-cols-12 gap-4 items-baseline">
                  <span className="col-span-2 sm:col-span-1 font-mono-num text-xs text-[#C5A46D]">{p.num}</span>
                  <h3 className="col-span-10 sm:col-span-4 font-display text-xl font-medium text-[#FAF9F6]">{p.title}</h3>
                  <p className="col-span-12 sm:col-span-7 text-sm text-[#E8DFD0]/75 leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#292929]/50 border border-[#C5A46D]/25 p-8 space-y-8 self-start">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Méthode en 4 étapes</p>
              <TextReveal as="h2" tone="dark" text={t.sections.howTitle} className="font-display text-3xl font-semibold" />
            </div>
            <div className="space-y-6">
              {workflowSteps.map((w) => (
                <div key={w.step} className="flex gap-4">
                  <span className="font-mono-num text-sm font-semibold text-[#C5A46D] shrink-0 pt-0.5">{w.step}</span>
                  <div className="space-y-1">
                    <h3 className="font-display text-xl font-semibold text-[#FAF9F6]">{w.title}</h3>
                    <p className="text-sm text-[#E8DFD0]/75 leading-relaxed">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/devis')}
              className="w-full py-3 px-6 bg-[#C5A46D] text-[#111111] text-sm font-semibold hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            >
              Démarrer mon projet
            </button>
          </div>
        </div>
      </section>

      {/* F. Témoignages clients */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10 space-y-2">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Retours d’expérience (Profils de démonstration)</p>
          <TextReveal as="h2" tone="light" text={t.sections.testimonialsTitle} className="font-display text-3xl md:text-4xl font-semibold" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.slice(0, 3).map((rev) => (
            <blockquote key={rev.id} className="border border-[#111111]/12 bg-[#FAF9F6] p-6 flex flex-col justify-between gap-6">
              <p className="font-display text-xl italic text-[#111111] leading-relaxed">« {rev.comment} »</p>
              <footer className="pt-4 border-t border-[#111111]/10">
                <div className="text-sm font-semibold text-[#111111]">{rev.authorName}</div>
                <div className="text-xs text-[#292929]/75 mt-0.5">
                  {rev.authorRole} · {rev.eventType}
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* G & H. Quick Quote Form + Newsletter */}
      <section className="bg-[#E8DFD0]/45 border-t border-[#111111]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 bg-[#FAF9F6] border border-[#111111]/15 p-8 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Réponse sous 24–48h</p>
              <TextReveal as="h2" tone="light" text={t.sections.quickQuoteTitle} className="font-display text-3xl font-semibold" />
            </div>

            {quoteStatus.type === 'success' ? (
              <div className="p-6 bg-[#E8DFD0]/50 border border-[#C5A46D] space-y-3">
                <p className="text-sm font-semibold text-[#111111]">
                  Référence générée : <span className="font-mono-num text-[#C5A46D]">{quoteStatus.reference}</span>
                </p>
                <p className="text-sm text-[#292929]">{quoteStatus.message}</p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuoteStatus({ type: 'idle' })}
                    className="px-4 py-2 text-xs font-medium border border-[#111111]/20 cursor-pointer"
                  >
                    Nouvelle demande
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/devis')}
                    className="px-4 py-2 text-xs font-medium bg-[#111111] text-[#FAF9F6] cursor-pointer"
                  >
                    Formulaire complet avec fichiers
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuickQuoteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">Type d’événement</label>
                  <select
                    value={quickQuote.eventType}
                    onChange={(e) => setQuickQuote({ ...quickQuote, eventType: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">Nom & prénom *</label>
                  <input
                    required
                    type="text"
                    value={quickQuote.clientName}
                    onChange={(e) => setQuickQuote({ ...quickQuote, clientName: e.target.value })}
                    placeholder="Votre nom complet"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">E-mail *</label>
                  <input
                    required
                    type="email"
                    value={quickQuote.clientEmail}
                    onChange={(e) => setQuickQuote({ ...quickQuote, clientEmail: e.target.value })}
                    placeholder="nom@exemple.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">Téléphone *</label>
                  <input
                    required
                    type="tel"
                    value={quickQuote.clientPhone}
                    onChange={(e) => setQuickQuote({ ...quickQuote, clientPhone: e.target.value })}
                    placeholder="06..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">Date souhaitée *</label>
                  <input
                    required
                    type="date"
                    value={quickQuote.eventDate}
                    onChange={(e) => setQuickQuote({ ...quickQuote, eventDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">Budget estimatif (MAD)</label>
                  <select
                    value={quickQuote.estimatedBudgetMad}
                    onChange={(e) => setQuickQuote({ ...quickQuote, estimatedBudgetMad: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  >
                    {settings.budgetRanges.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#292929] mb-1.5">Description succincte</label>
                  <textarea
                    rows={3}
                    value={quickQuote.projectDescription}
                    onChange={(e) => setQuickQuote({ ...quickQuote, projectDescription: e.target.value })}
                    placeholder="Précisez vos envies, le lieu envisagé ou le nombre d'invités..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20 focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>

                {quoteStatus.type === 'error' && (
                  <p className="sm:col-span-2 text-xs text-red-700 font-medium">{quoteStatus.message}</p>
                )}

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={quoteStatus.type === 'loading'}
                    className="px-6 py-3 bg-[#111111] text-[#FAF9F6] text-sm font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {quoteStatus.type === 'loading' ? 'Envoi...' : 'Envoyer ma demande de devis'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/devis')}
                    className="text-xs font-medium text-[#292929] underline underline-offset-4 hover:text-[#111111] cursor-pointer"
                  >
                    Ouvrir le formulaire détaillé
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between gap-8 bg-[#111111] text-[#FAF9F6] p-8 border border-[#C5A46D]/30">
            <div className="space-y-4">
              <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Lettre d’information</p>
              <TextReveal as="h2" tone="dark" text={t.sections.newsletterTitle} className="font-display text-3xl font-semibold" />
              <p className="text-sm text-[#E8DFD0]/80 leading-relaxed">
                Recevez nos guides de préparation événementielle, nos nouvelles inspirations scénographiques à Casablanca et les dates d’ouverture de saison.
              </p>

              <form onSubmit={handleNewsletterSubmit} className="space-y-3 pt-3">
                <input
                  required
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Votre adresse e-mail"
                  className="w-full px-4 py-3 text-sm bg-[#292929] border border-[#FAF9F6]/20 text-[#FAF9F6] placeholder:text-[#FAF9F6]/50 focus:border-[#C5A46D] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus.type === 'loading'}
                  className="w-full py-3 px-6 bg-[#C5A46D] text-[#111111] text-sm font-semibold hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                >
                  {newsletterStatus.type === 'loading' ? 'Inscription...' : 'S’inscrire à la newsletter'}
                </button>
                {newsletterStatus.type === 'success' && (
                  <p className="text-xs text-[#C5A46D]">{newsletterStatus.message}</p>
                )}
                {newsletterStatus.type === 'error' && (
                  <p className="text-xs text-red-400">{newsletterStatus.message}</p>
                )}
              </form>
            </div>

            <div className="pt-6 border-t border-[#FAF9F6]/15 flex items-center justify-between text-xs text-[#E8DFD0]/70">
              <span>Déjà client STRONG EVENT PRO ?</span>
              <button
                type="button"
                onClick={() => navigate('/connexion')}
                className="text-[#C5A46D] font-semibold hover:underline cursor-pointer"
              >
                Accéder à l’espace client
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
