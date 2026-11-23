import React, { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { BeforeAfterGallery } from '../components/BeforeAfterGallery';
import { TextReveal } from '../components/TextReveal';
import { formatMad } from '../lib/i18n';
import type { EventCategory, PortfolioItem, ProviderProfile, ServiceItem, ServicePackage } from '../types';

/* ---------------- SERVICES & PACKAGES PAGE ---------------- */
interface ServicesPageProps {
  services: ServiceItem[];
  packages: ServicePackage[];
  navigate: (path: string) => void;
  onPreselectService: (serviceName: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  services,
  packages,
  navigate,
  onPreselectService,
}) => {
  const categories = [
    'Tous',
    'Décoration',
    'Restauration',
    'Sonorisation & Animation',
    'Photo & Vidéo',
    'Logistique',
    'Communication',
  ];
  const [selectedCat, setSelectedCat] = useState('Tous');
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);

  const filtered = selectedCat === 'Tous' ? services : services.filter((s) => s.category === selectedCat);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      <div className="max-w-3xl space-y-3 border-b border-[#111111]/10 pb-8">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Catalogue des prestations</p>
        <TextReveal as="h1" tone="light" text="Nos Services Événementiels" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-base text-[#292929] leading-relaxed">
          Six pôles d’expertise coordonnés en interne à Casablanca pour concevoir, équiper et animer chaque temps fort de votre réception.
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCat === cat
                ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]'
                : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15 hover:border-[#C5A46D]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((srv) => (
          <article
            key={srv.id}
            className="border border-[#111111]/12 bg-[#FAF9F6] flex flex-col justify-between overflow-hidden hover:border-[#C5A46D] transition-colors"
          >
            <div>
              <div className="aspect-[4/3] bg-[#111111] overflow-hidden">
                <SafeImage src={srv.imageUrl} alt={srv.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 space-y-3">
                <div className="text-xs text-[#292929]/75 flex items-center gap-2">
                  <span>{srv.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{srv.isAvailable ? 'Disponible' : 'Sur vérification'}</span>
                </div>
                <h2 className="font-display text-2xl font-semibold text-[#111111]">{srv.name}</h2>
                <p className="text-sm text-[#292929] leading-relaxed">{srv.description}</p>
                <div className="pt-2 font-mono-num text-sm font-semibold text-[#C5A46D]">{srv.priceLabel}</div>
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 border-t border-[#111111]/10 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveService(srv)}
                className="flex-1 py-2.5 px-3 text-xs font-medium border border-[#111111]/20 hover:border-[#C5A46D] transition-colors cursor-pointer"
              >
                Fiche détaillée
              </button>
              <button
                type="button"
                onClick={() => {
                  onPreselectService(srv.name);
                  navigate('/devis');
                }}
                className="flex-1 py-2.5 px-3 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
              >
                Demander un devis
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Packages Section */}
      <section className="pt-12 border-t border-[#111111]/10 space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Formules configurables</p>
          <TextReveal as="h2" tone="light" text="Nos Formules & Packages" className="font-display text-3xl md:text-4xl font-semibold" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`p-8 border flex flex-col justify-between gap-6 ${
                pkg.slug === 'pack-prestige' ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]' : 'bg-[#E8DFD0]/40 border-[#111111]/15'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl font-semibold text-[#C5A46D]">{pkg.name}</h3>
                  <span className="font-mono-num text-lg font-semibold">{formatMad(pkg.indicativePriceMad)}</span>
                </div>
                <p className={`text-sm font-medium ${pkg.slug === 'pack-prestige' ? 'text-[#FAF9F6]' : 'text-[#111111]'}`}>
                  {pkg.subtitle}
                </p>
                <p className={`text-sm leading-relaxed ${pkg.slug === 'pack-prestige' ? 'text-[#E8DFD0]/80' : 'text-[#292929]'}`}>
                  {pkg.description}
                </p>
                <div className="pt-3 border-t border-current/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold mb-2">Prestations incluses</p>
                    <ul className="space-y-1.5">
                      {pkg.includedItems.map((it, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#C5A46D] shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Options supplémentaires</p>
                    <ul className="space-y-1.5 opacity-80">
                      {pkg.extraOptions.map((op, idx) => (
                        <li key={idx}>+ {op}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/reserver')}
                  className="flex-1 py-3 px-4 text-xs font-semibold bg-[#C5A46D] text-[#111111] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                >
                  Réserver cette formule
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/devis')}
                  className={`flex-1 py-3 px-4 text-xs font-medium border transition-colors cursor-pointer ${
                    pkg.slug === 'pack-prestige'
                      ? 'border-[#FAF9F6]/30 text-[#FAF9F6] hover:border-[#C5A46D]'
                      : 'border-[#111111]/25 text-[#111111] hover:border-[#C5A46D]'
                  }`}
                >
                  Demander un devis
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Service Modal */}
      {activeService && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-[#FAF9F6] text-[#111111] max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#111111]/15 shadow-2xl">
            <div className="aspect-[16/9] bg-[#111111] relative">
              <SafeImage src={activeService.imageUrl} alt={activeService.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setActiveService(null)}
                className="absolute top-4 end-4 p-2 bg-[#111111]/85 text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div className="text-xs text-[#292929]/75 flex flex-wrap gap-2">
                <span>{activeService.category}</span>
                <span aria-hidden="true">·</span>
                <span>Durée : {activeService.duration}</span>
                <span aria-hidden="true">·</span>
                <span>{activeService.isAvailable ? 'Disponible' : 'Sur demande'}</span>
              </div>
              <h3 className="font-display text-3xl font-semibold">{activeService.name}</h3>
              <p className="font-mono-num text-lg font-semibold text-[#C5A46D]">{activeService.priceLabel}</p>
              <p className="text-sm text-[#292929] leading-relaxed">{activeService.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#111111]/10">
                <div>
                  <h4 className="text-xs font-semibold text-[#111111] mb-2">Prestations incluses</h4>
                  <ul className="space-y-1.5 text-sm text-[#292929]">
                    {activeService.includedItems.map((it, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#111111] mb-2">Options & Conditions</h4>
                  <ul className="space-y-1 text-sm text-[#292929] mb-3">
                    {activeService.options.map((op, idx) => (
                      <li key={idx}>+ {op}</li>
                    ))}
                  </ul>
                  {activeService.conditions && (
                    <p className="text-xs text-[#292929]/80 border-t border-[#111111]/10 pt-2">
                      Conditions : {activeService.conditions}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onPreselectService(activeService.name);
                    setActiveService(null);
                    navigate('/devis');
                  }}
                  className="flex-1 py-3 px-5 bg-[#111111] text-[#FAF9F6] text-sm font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
                >
                  Demander un devis pour ce service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- EVENT CATEGORIES PAGE ---------------- */
interface EventsCatalogPageProps {
  categories: EventCategory[];
  portfolio: PortfolioItem[];
  navigate: (path: string) => void;
  onSelectEventType: (eventName: string) => void;
}

export const EventsCatalogPage: React.FC<EventsCatalogPageProps> = ({
  categories,
  portfolio,
  navigate,
  onSelectEventType,
}) => {
  const groups: EventCategory['groupName'][] = [
    'Événements Privés',
    'Événements Professionnels',
    'Événements Festifs',
  ];
  const [selectedCat, setSelectedCat] = useState<EventCategory | null>(null);

  if (selectedCat) {
    const relatedExamples = portfolio.filter(
      (p) => p.eventType.toLowerCase().includes(selectedCat.name.toLowerCase()) || p.eventType === selectedCat.name
    );
    const displayExamples = relatedExamples.length > 0 ? relatedExamples : portfolio.slice(0, 2);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <button
          type="button"
          onClick={() => setSelectedCat(null)}
          className="text-xs font-medium text-[#292929] hover:text-[#C5A46D] underline underline-offset-4 cursor-pointer"
        >
          ← Retour au catalogue des événements
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 aspect-[16/10] lg:aspect-auto bg-[#111111] overflow-hidden">
            <SafeImage src={selectedCat.coverImage} alt={selectedCat.name} className="w-full h-full object-cover" />
          </div>
          <div className="lg:col-span-5 bg-[#E8DFD0]/45 border border-[#111111]/12 p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-[#C5A46D]">{selectedCat.groupName}</p>
              <TextReveal as="h1" tone="light" text={selectedCat.name} className="font-display text-4xl font-semibold" />
              <p className="text-sm text-[#292929] leading-relaxed">{selectedCat.description}</p>
              <div className="pt-4 border-t border-[#111111]/10 space-y-2">
                <p className="text-xs font-semibold text-[#111111]">Prestations disponibles pour ce format</p>
                <ul className="space-y-1.5 text-sm text-[#292929]">
                  {selectedCat.includedServices.map((srv, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#C5A46D]" />
                      <span>{srv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  onSelectEventType(selectedCat.name);
                  navigate('/devis');
                }}
                className="flex-1 py-3 px-4 text-xs font-semibold border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#FAF9F6] transition-colors cursor-pointer"
              >
                Demander un devis
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectEventType(selectedCat.name);
                  navigate('/reserver');
                }}
                className="flex-1 py-3 px-4 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
              >
                Réserver cet événement
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-[#111111]/10">
          <h2 className="font-display text-2xl font-semibold">Exemples de mise en scène (Démonstration)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayExamples.map((ex) => (
              <div key={ex.id} className="border border-[#111111]/10 bg-[#FAF9F6] flex flex-col sm:flex-row overflow-hidden">
                <div className="sm:w-48 aspect-[4/3] sm:aspect-auto bg-[#111111] shrink-0">
                  <SafeImage src={ex.galleryUrls[0] || ''} alt={ex.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 space-y-2">
                  <div className="text-xs text-[#C5A46D]">{ex.eventType} · {ex.city}</div>
                  <h3 className="font-display text-xl font-semibold">{ex.title}</h3>
                  <p className="text-xs text-[#292929] leading-relaxed">{ex.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      <div className="max-w-3xl space-y-3 border-b border-[#111111]/10 pb-8">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">22 Formats maîtrisés</p>
        <TextReveal as="h1" tone="light" text="Nos Événements" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-base text-[#292929]">
          Sélectionnez une catégorie pour consulter les prestations recommandées, des exemples de scénographies et lancer votre devis ou réservation.
        </p>
      </div>

      {groups.map((grp) => (
        <section key={grp} className="space-y-6">
          <h2 className="font-display text-3xl font-semibold text-[#111111] border-b border-[#111111]/10 pb-3">{grp}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories
              .filter((c) => c.groupName === grp)
              .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className="text-left border border-[#111111]/12 bg-[#FAF9F6] hover:border-[#C5A46D] transition-colors overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-[#111111] w-full overflow-hidden">
                    <SafeImage src={cat.coverImage} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-display text-xl font-semibold text-[#111111]">{cat.name}</h3>
                      <p className="text-xs text-[#292929] line-clamp-2">{cat.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C5A46D]">
                      Consulter <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
};

/* ---------------- PORTFOLIO / REALISATIONS PAGE ---------------- */
interface PortfolioPageProps {
  portfolio: PortfolioItem[];
  navigate: (path: string) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ portfolio, navigate }) => {
  const types = ['Tous', ...Array.from(new Set(portfolio.map((p) => p.eventType)))];
  const [filter, setFilter] = useState('Tous');
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null);

  const visible = filter === 'Tous' ? portfolio : portfolio.filter((p) => p.eventType === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-12">
      <div className="max-w-3xl space-y-3 border-b border-[#111111]/10 pb-8">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Galerie & Scénographies</p>
        <TextReveal as="h1" tone="light" text="Nos Réalisations" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-sm md:text-base text-[#292929]">
          Les projets identifiés « Projet de démonstration » illustrent le savoir-faire esthétique et technique de la plateforme sans correspondre à des clients réels passés.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {types.map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => setFilter(tp)}
            className={`px-4 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filter === tp ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]' : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15 hover:border-[#C5A46D]'
            }`}
          >
            {tp}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visible.map((item) => (
          <article
            key={item.id}
            onClick={() => setLightbox(item)}
            className="group border border-[#111111]/12 bg-[#FAF9F6] hover:border-[#C5A46D] transition-colors cursor-pointer overflow-hidden flex flex-col"
          >
            <div className="aspect-[4/3] bg-[#111111] overflow-hidden">
              <SafeImage
                src={item.galleryUrls[0] || ''}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-luxury"
              />
            </div>
            <div className="p-6 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs text-[#292929]/75 flex flex-wrap items-center gap-2">
                  <span>{item.eventType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.city}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{item.eventDate}</span>
                </div>
                <h2 className="font-display text-2xl font-semibold text-[#111111]">{item.title}</h2>
                <p className="text-sm text-[#292929] leading-relaxed">{item.description}</p>
              </div>
              {item.isDemo && (
                <p className="text-xs font-medium text-[#C5A46D] pt-3 border-t border-[#111111]/10">
                  Visuel & projet de démonstration
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <section className="pt-12 border-t border-[#111111]/10">
        <BeforeAfterGallery navigate={navigate} compact />
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-[#FAF9F6] text-[#111111] max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#C5A46D]/40">
            <div className="aspect-[16/10] bg-[#111111] relative">
              <SafeImage src={lightbox.galleryUrls[0] || ''} alt={lightbox.title} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute top-4 end-4 p-2.5 bg-[#111111]/90 text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="text-xs text-[#292929]/75">
                {lightbox.eventType} · {lightbox.city} · <span className="font-mono-num">{lightbox.eventDate}</span>
              </div>
              <h3 className="font-display text-3xl font-semibold">{lightbox.title}</h3>
              <p className="text-sm text-[#292929] leading-relaxed">{lightbox.description}</p>
              {lightbox.testimonialQuote && (
                <blockquote className="p-4 bg-[#E8DFD0]/45 border border-[#111111]/10 text-sm italic">
                  « {lightbox.testimonialQuote} »
                  <footer className="not-italic text-xs font-semibold mt-1">— {lightbox.testimonialAuthor}</footer>
                </blockquote>
              )}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLightbox(null);
                    navigate('/devis');
                  }}
                  className="px-5 py-2.5 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
                >
                  Organiser un projet similaire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- PROVIDERS / PRESTATAIRES PAGE ---------------- */
interface ProvidersPageProps {
  providers: ProviderProfile[];
  navigate: (path: string) => void;
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({ providers, navigate }) => {
  const providerCategories = [
    'Tous',
    'Traiteurs',
    'Décorateurs',
    'Photographes',
    'Vidéastes',
    'DJ',
    'Musiciens',
    'Loueurs de salles',
    'Loueurs de matériel',
    'Fleuristes',
    'Animateurs',
    'Personnel événementiel',
  ];
  const [catFilter, setCatFilter] = useState('Tous');
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({
    businessName: '',
    category: 'Traiteurs',
    city: 'Casablanca',
    email: '',
    phone: '',
    indicativePriceMad: '',
    description: '',
    servicesOffered: '',
    availabilityNotes: '',
  });
  const [applyMsg, setApplyMsg] = useState<{ type: 'idle' | 'success' | 'error'; text?: string }>({ type: 'idle' });

  const filtered = catFilter === 'Tous' ? providers : providers.filter((p) => p.category === catFilter);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/providers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...applyForm,
          indicativePriceMad: applyForm.indicativePriceMad ? Number(applyForm.indicativePriceMad) : null,
          servicesOffered: applyForm.servicesOffered.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyMsg({ type: 'error', text: data.error });
        return;
      }
      setApplyMsg({ type: 'success', text: data.message });
      setApplyForm({
        businessName: '',
        category: 'Traiteurs',
        city: 'Casablanca',
        email: '',
        phone: '',
        indicativePriceMad: '',
        description: '',
        servicesOffered: '',
        availabilityNotes: '',
      });
    } catch {
      setApplyMsg({ type: 'error', text: 'Erreur lors de la soumission.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#111111]/10 pb-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Réseau sélectionné à Casablanca & au Maroc</p>
          <TextReveal as="h1" tone="light" text="Nos Prestataires" className="font-display text-4xl md:text-5xl font-semibold" />
          <p className="text-sm md:text-base text-[#292929]">
            Chaque partenaire est validé par l’administration STRONG EVENT PRO avant publication. Les fiches marquées « Démonstration » sont des profils exemples.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowApplyForm((v) => !v)}
          className="px-5 py-3 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {showApplyForm ? 'Fermer le formulaire' : 'Devenir prestataire partenaire'}
        </button>
      </div>

      {showApplyForm && (
        <form onSubmit={handleApply} className="bg-[#E8DFD0]/45 border border-[#111111]/15 p-8 space-y-5">
          <h2 className="font-display text-2xl font-semibold">Candidature Prestataire (Soumise à validation)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              required
              placeholder="Nom commercial *"
              value={applyForm.businessName}
              onChange={(e) => setApplyForm({ ...applyForm, businessName: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <select
              value={applyForm.category}
              onChange={(e) => setApplyForm({ ...applyForm, category: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            >
              {providerCategories.filter((c) => c !== 'Tous').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              placeholder="Ville (ex: Casablanca)"
              value={applyForm.city}
              onChange={(e) => setApplyForm({ ...applyForm, city: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <input
              required
              type="email"
              placeholder="E-mail professionnel *"
              value={applyForm.email}
              onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <input
              placeholder="Téléphone"
              value={applyForm.phone}
              onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <input
              type="number"
              placeholder="Tarif indicatif (MAD)"
              value={applyForm.indicativePriceMad}
              onChange={(e) => setApplyForm({ ...applyForm, indicativePriceMad: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <input
              placeholder="Prestations proposées (séparées par virgule)"
              value={applyForm.servicesOffered}
              onChange={(e) => setApplyForm({ ...applyForm, servicesOffered: e.target.value })}
              className="md:col-span-2 px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <input
              placeholder="Disponibilités habituelles"
              value={applyForm.availabilityNotes}
              onChange={(e) => setApplyForm({ ...applyForm, availabilityNotes: e.target.value })}
              className="px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
            <textarea
              required
              rows={3}
              placeholder="Présentation de votre expertise *"
              value={applyForm.description}
              onChange={(e) => setApplyForm({ ...applyForm, description: e.target.value })}
              className="md:col-span-3 px-3.5 py-2.5 text-sm bg-white border border-[#111111]/20"
            />
          </div>
          {applyMsg.text && (
            <p className={`text-xs font-medium ${applyMsg.type === 'error' ? 'text-red-700' : 'text-[#111111]'}`}>
              {applyMsg.text}
            </p>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
          >
            Soumettre mon profil pour validation
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {providerCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCatFilter(c)}
            className={`px-3.5 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              catFilter === c ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]' : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15 hover:border-[#C5A46D]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((pr) => (
          <article
            key={pr.id}
            onClick={() => setSelectedProvider(pr)}
            className="border border-[#111111]/12 bg-[#FAF9F6] hover:border-[#C5A46D] transition-colors cursor-pointer flex flex-col overflow-hidden"
          >
            <div className="aspect-[4/3] bg-[#111111]">
              <SafeImage src={pr.imageUrl} alt={pr.businessName} className="w-full h-full object-cover" />
            </div>
            <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-xs text-[#292929]/75 flex items-center gap-2">
                  <span>{pr.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pr.city}</span>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#111111]">{pr.businessName}</h2>
                <p className="text-xs text-[#292929] line-clamp-2">{pr.description}</p>
              </div>
              <div className="pt-3 border-t border-[#111111]/10 flex items-center justify-between text-xs">
                <span className="font-mono-num font-semibold text-[#111111]">
                  {pr.indicativePriceMad ? `Dès ${formatMad(pr.indicativePriceMad)}` : 'Sur devis'}
                </span>
                {pr.isDemo && <span className="text-[#C5A46D]">Démonstration</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-[#FAF9F6] text-[#111111] max-w-xl w-full border border-[#111111]/15 shadow-2xl overflow-hidden">
            <div className="aspect-[16/9] bg-[#111111] relative">
              <SafeImage src={selectedProvider.imageUrl} alt={selectedProvider.businessName} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="absolute top-4 end-4 p-2 bg-[#111111]/85 text-[#FAF9F6] cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-[#292929]/75">
                {selectedProvider.category} · {selectedProvider.city} · {selectedProvider.isDemo ? 'Profil de démonstration' : 'Prestataire vérifié'}
              </div>
              <h3 className="font-display text-2xl font-semibold">{selectedProvider.businessName}</h3>
              <p className="text-sm text-[#292929]">{selectedProvider.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-semibold">Services proposés :</p>
                <p className="text-sm text-[#292929]">{selectedProvider.servicesOffered.join(' · ')}</p>
              </div>
              {selectedProvider.availabilityNotes && (
                <p className="text-xs text-[#292929]/80">Disponibilités : {selectedProvider.availabilityNotes}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider(null);
                  navigate('/devis');
                }}
                className="w-full py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
              >
                Intégrer ce prestataire à mon devis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
