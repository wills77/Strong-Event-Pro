import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { TextReveal } from '../components/TextReveal';
import type { FaqItem, NewsArticle, StoreSettings } from '../types';

/* ---------------- ABOUT PAGE ---------------- */
interface AboutPageProps {
  settings: StoreSettings;
  navigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ settings, navigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
        <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Casablanca, Maroc · {settings.slogan}</p>
          <TextReveal as="h1" tone="light" text="À propos de STRONG EVENT PRO" className="font-display text-4xl md:text-5xl font-semibold" />
          <p className="text-base text-[#292929] leading-relaxed">{settings.aboutText}</p>
          <p className="text-sm text-[#292929] leading-relaxed">
            Notre studio allie direction artistique, ingénierie technique et gestion budgétaire rigoureuse en MAD. Chaque projet bénéficie d’un interlocuteur unique, d’un suivi transparent en ligne et d’un réseau de partenaires triés sur le volet.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/devis')}
              className="px-6 py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Parler de votre projet
            </button>
            <button
              type="button"
              onClick={() => navigate('/prestataires')}
              className="px-6 py-3 border border-[#111111]/20 text-xs font-medium hover:border-[#C5A46D] transition-colors cursor-pointer"
            >
              Découvrir nos partenaires
            </button>
          </div>
        </div>
        <div className="lg:col-span-6 aspect-[4/3] lg:aspect-auto bg-[#111111] overflow-hidden">
          <SafeImage
            src="/src/assets/images/agency_casablanca_atelier_1795461365161.jpg"
            alt="Atelier de création événementielle STRONG EVENT PRO à Casablanca"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-[#111111]/10">
        {[
          { num: '01', title: 'Exigence Scénographique', desc: 'Une esthétique contemporaine épurée inspirée par le patrimoine architectural marocain et les standards internationaux.' },
          { num: '02', title: 'Maîtrise Logistique', desc: 'Planification en 7 jalons, repérages techniques sur site et coordination minutée de l’ensemble des équipes.' },
          { num: '03', title: 'Transparence Financière', desc: 'Devis détaillés en Dirhams marocains (MAD), validation client en ligne et suivi rigoureux des règlements.' },
        ].map((v) => (
          <div key={v.num} className="border border-[#111111]/12 bg-[#FAF9F6] p-6 space-y-2">
            <span className="font-mono-num text-xs text-[#C5A46D]">{v.num}.</span>
            <h2 className="font-display text-2xl font-semibold">{v.title}</h2>
            <p className="text-sm text-[#292929] leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------------- NEWS & TIPS + FAQ PAGE ---------------- */
interface NewsPageProps {
  articles: NewsArticle[];
  faqs: FaqItem[];
}

export const NewsPage: React.FC<NewsPageProps> = ({ articles, faqs }) => {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [openFaqId, setOpenFaqId] = useState<number | null>(faqs[0]?.id ?? null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      <div className="max-w-3xl space-y-3 border-b border-[#111111]/10 pb-8">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Journal & Guides pratiques</p>
        <TextReveal as="h1" tone="light" text="Actualités & Conseils" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-base text-[#292929]">
          Tendances scénographiques à Casablanca, checklists techniques et réponses aux questions fréquentes.
        </p>
      </div>

      {selectedArticle ? (
        <article className="max-w-3xl space-y-6">
          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="text-xs font-medium text-[#292929] hover:text-[#C5A46D] underline underline-offset-4 cursor-pointer"
          >
            ← Retour aux articles
          </button>
          <div className="text-xs text-[#C5A46D]">{selectedArticle.category}</div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold">{selectedArticle.title}</h2>
          <div className="aspect-[16/9] bg-[#111111] overflow-hidden">
            <SafeImage src={selectedArticle.imageUrl} alt={selectedArticle.title} className="w-full h-full object-cover" />
          </div>
          <p className="text-base text-[#292929] leading-relaxed whitespace-pre-line">{selectedArticle.content}</p>
        </article>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((art) => (
            <article
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="border border-[#111111]/12 bg-[#FAF9F6] hover:border-[#C5A46D] transition-colors cursor-pointer overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#111111]">
                <SafeImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 space-y-2 flex-1">
                <div className="text-xs text-[#C5A46D]">{art.category}</div>
                <h2 className="font-display text-2xl font-semibold text-[#111111]">{art.title}</h2>
                <p className="text-sm text-[#292929] line-clamp-3">{art.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* FAQ Section */}
      <section className="pt-12 border-t border-[#111111]/10 max-w-4xl space-y-6">
        <TextReveal as="h2" tone="light" text="Questions fréquentes" className="font-display text-3xl font-semibold" />
        <div className="divide-y divide-[#111111]/10 border-t border-b border-[#111111]/10">
          {faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div key={faq.id} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-4 text-start font-medium text-sm md:text-base text-[#111111] cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-[#C5A46D]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-[#C5A46D]" />}
                </button>
                {isOpen && <p className="mt-3 text-sm text-[#292929] leading-relaxed">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

/* ---------------- CONTACT PAGE ---------------- */
interface ContactPageProps {
  settings: StoreSettings;
}

export const ContactPage: React.FC<ContactPageProps> = ({ settings }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrMsg(data.error || 'Erreur lors de l’envoi.');
        return;
      }
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      setStatus('error');
      setErrMsg('Erreur réseau.');
    }
  };

  const hasValidEmbedUrl =
    settings.googleMapsEmbedUrl.startsWith('https://www.google.com/maps/embed') ||
    settings.googleMapsEmbedUrl.startsWith('https://maps.google.com/');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-12">
      <div className="max-w-3xl space-y-3 border-b border-[#111111]/10 pb-8">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Casablanca, Maroc</p>
        <TextReveal as="h1" tone="light" text="Contactez STRONG EVENT PRO" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-base text-[#292929]">
          Échangez directement avec notre équipe pour planifier un rendez-vous ou préciser les modalités de votre événement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 bg-white border border-[#111111]/12 p-8 space-y-6">
          <h2 className="font-display text-2xl font-semibold">Envoyer un message</h2>
          {status === 'success' ? (
            <div className="p-6 bg-[#E8DFD0]/50 border border-[#C5A46D] space-y-3">
              <p className="text-sm font-semibold">Message transmis avec succès.</p>
              <p className="text-xs text-[#292929]">Votre message est enregistré et visible dans notre interface d’administration.</p>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="px-4 py-2 text-xs border border-[#111111]/20 cursor-pointer"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Nom complet *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  required
                  type="email"
                  placeholder="Adresse e-mail *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  placeholder="Téléphone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  required
                  placeholder="Objet *"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </div>
              <textarea
                required
                rows={5}
                placeholder="Votre message *"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
              {status === 'error' && <p className="text-xs text-red-700">{errMsg}</p>}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-7 py-3 bg-[#111111] text-[#FAF9F6] text-sm font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
              >
                {status === 'loading' ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-[#111111] text-[#FAF9F6] p-8 border border-[#C5A46D]/30 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#C5A46D]">Coordonnées de l’agence</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[#E8DFD0]/65">Ville</dt>
                <dd>{settings.city}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#E8DFD0]/65">Adresse</dt>
                <dd>{settings.address || 'Non configurée (paramétrable dans /admin)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#E8DFD0]/65">Téléphone</dt>
                <dd className="font-mono-num">{settings.phone || 'Non configuré (paramétrable dans /admin)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#E8DFD0]/65">WhatsApp Business</dt>
                <dd className="font-mono-num">{settings.whatsappNumber || 'Non configuré (paramétrable dans /admin)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#E8DFD0]/65">E-mail</dt>
                <dd>{settings.email || 'Non configuré (paramétrable dans /admin)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#E8DFD0]/65">Horaires d’ouverture</dt>
                <dd>{settings.openingHours || 'Sur rendez-vous'}</dd>
              </div>
            </dl>
          </div>

          <div className="border border-[#111111]/15 bg-[#E8DFD0]/40 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
              <MapPin className="w-4 h-4 text-[#C5A46D]" />
              <span>Localisation Google Maps</span>
            </div>
            {hasValidEmbedUrl ? (
              <iframe
                title="Localisation STRONG EVENT PRO"
                src={settings.googleMapsEmbedUrl}
                className="w-full h-56 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 bg-[#FAF9F6] border border-[#111111]/10 space-y-2">
                <p className="text-xs text-[#292929]">
                  La carte Google Maps est configurable depuis l’espace d’administration (onglet Contenu & Paramètres).
                </p>
                {settings.googleMapsLink && settings.googleMapsLink.startsWith('https://') && (
                  <a
                    href={settings.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#C5A46D] underline"
                  >
                    Ouvrir l’itinéraire Google Maps
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
