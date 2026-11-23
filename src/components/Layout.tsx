import React, { useState } from 'react';
import { Menu, MessageCircle, X, Globe, Shield, User } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { WelcomeModal } from './WelcomeModal';
import { TRANSLATIONS } from '../lib/i18n';
import type { AuthUser, Lang, StoreSettings } from '../types';

interface LayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  settings: StoreSettings;
  user: AuthUser | null;
  splashDone?: boolean;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPath,
  navigate,
  lang,
  setLang,
  settings,
  user,
  splashDone = true,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'legal' | 'privacy' | 'terms' | null>(null);
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const isAdminRoute = currentPath.startsWith('/admin');

  const navLinks = [
    { label: t.nav.services, path: '/services' },
    { label: t.nav.portfolio, path: '/realisations' },
    { label: t.nav.providers, path: '/prestataires' },
    { label: t.nav.about, path: '/a-propos' },
    { label: t.nav.contact, path: '/contact' },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleWhatsappClick = () => {
    const num = settings.whatsappNumber.replace(/[^\d+]/g, '');
    if (num && num.length >= 8) {
      window.open(`https://wa.me/${num.replace(/^\+/, '')}`, '_blank', 'noopener,noreferrer');
    } else {
      setWaModalOpen(true);
    }
  };

  if (isAdminRoute) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#FAF9F6] text-[#111111]">
        {children}
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#111111]">
      {/* Top Bar Contract: 3 strict zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#111111]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark only */}
          <BrandLogo variant="dark" onClick={() => handleNav('/')} />

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#292929]" aria-label="Navigation principale">
            {navLinks.map((item) => {
              const active = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors duration-200 cursor-pointer ${
                    active
                      ? 'text-[#111111] border-[#C5A46D]'
                      : 'border-transparent hover:text-[#111111] hover:border-[#C5A46D]/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA + Mobile Drawer Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNav('/reserver')}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-xs md:text-sm font-medium bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] transition-colors duration-200 ease-luxury whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.nav.book}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2.5 text-[#111111] border border-[#111111]/15 hover:border-[#C5A46D] transition-colors cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expanded Navigation Drawer (Secondary routes, Client Portal, Quote, Admin, Language) */}
        {mobileMenuOpen && (
          <div className="border-t border-[#111111]/10 bg-[#FAF9F6]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#292929]/70 mb-3">Découvrir</p>
                {[
                  { label: t.nav.home, path: '/' },
                  { label: t.nav.events, path: '/evenements' },
                  { label: t.nav.services, path: '/services' },
                  { label: t.nav.portfolio, path: '/realisations' },
                  { label: t.nav.providers, path: '/prestataires' },
                ].map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleNav(link.path)}
                    className="block w-full text-start py-1.5 text-sm font-medium text-[#111111] hover:text-[#C5A46D] transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#292929]/70 mb-3">Projets & Accompagnement</p>
                {[
                  { label: t.nav.quote, path: '/devis' },
                  { label: t.nav.book, path: '/reserver' },
                  { label: t.nav.news, path: '/actualites' },
                  { label: t.nav.about, path: '/a-propos' },
                  { label: t.nav.contact, path: '/contact' },
                ].map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleNav(link.path)}
                    className="block w-full text-start py-1.5 text-sm font-medium text-[#111111] hover:text-[#C5A46D] transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4 border-t md:border-t-0 md:border-s border-[#111111]/10 pt-4 md:pt-0 md:ps-6">
                <p className="text-xs font-medium text-[#292929]/70">Espaces & Langue</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleNav(user ? (user.role === 'admin' ? '/admin' : '/espace-client') : '/connexion')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#111111]/20 hover:border-[#C5A46D] text-[#111111] transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#C5A46D]" />
                    <span>{user ? `${t.nav.clientArea} (${user.fullName.split(' ')[0]})` : t.nav.clientArea}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/admin')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#111111]/20 hover:border-[#C5A46D] text-[#111111] transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-[#C5A46D]" />
                    <span>{t.nav.admin}</span>
                  </button>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2 text-xs text-[#292929] mb-2">
                    <Globe className="w-3.5 h-3.5 text-[#C5A46D]" />
                    <span>Langue de l’interface</span>
                  </div>
                  <div className="inline-flex border border-[#111111]/15 p-0.5 bg-[#E8DFD0]/40">
                    {(['fr', 'ar', 'en'] as Lang[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLang(code)}
                        className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          lang === code ? 'bg-[#111111] text-[#FAF9F6]' : 'text-[#292929] hover:text-[#111111]'
                        }`}
                      >
                        {code === 'fr' ? 'Français' : code === 'ar' ? 'العربية' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet Luxury Footer */}
      <footer className="bg-[#111111] text-[#FAF9F6] border-t border-[#C5A46D]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-4">
            <BrandLogo variant="light" onClick={() => handleNav('/')} />
            <p className="text-sm text-[#E8DFD0]/85 leading-relaxed">
              {settings.slogan}
            </p>
            <p className="text-xs text-[#E8DFD0]/65 leading-relaxed">
              Agence événementielle dédiée aux réceptions privées, sommets corporate et productions scéniques à Casablanca, Maroc.
            </p>
            <div className="pt-2 inline-flex border border-[#FAF9F6]/15 p-0.5">
              {(['fr', 'ar', 'en'] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                    lang === code ? 'bg-[#C5A46D] text-[#111111] font-semibold' : 'text-[#FAF9F6]/70 hover:text-[#FAF9F6]'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg text-[#C5A46D] mb-4">Navigation</h3>
            <ul className="space-y-2.5 text-sm text-[#FAF9F6]/80">
              {[
                { label: t.nav.home, path: '/' },
                { label: t.nav.events, path: '/evenements' },
                { label: t.nav.services, path: '/services' },
                { label: t.nav.portfolio, path: '/realisations' },
                { label: t.nav.providers, path: '/prestataires' },
                { label: t.nav.news, path: '/actualites' },
              ].map((l) => (
                <li key={l.path}>
                  <button
                    type="button"
                    onClick={() => handleNav(l.path)}
                    className="hover:text-[#C5A46D] transition-colors cursor-pointer"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-lg text-[#C5A46D] mb-4">Actions & Espaces</h3>
            <ul className="space-y-2.5 text-sm text-[#FAF9F6]/80">
              {[
                { label: t.nav.quote, path: '/devis' },
                { label: t.nav.book, path: '/reserver' },
                { label: t.nav.clientArea, path: user ? '/espace-client' : '/connexion' },
                { label: t.nav.about, path: '/a-propos' },
                { label: t.nav.contact, path: '/contact' },
                { label: t.nav.admin, path: '/admin' },
              ].map((l) => (
                <li key={l.path}>
                  <button
                    type="button"
                    onClick={() => handleNav(l.path)}
                    className="hover:text-[#C5A46D] transition-colors cursor-pointer"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 text-sm text-[#FAF9F6]/80">
            <h3 className="font-display text-lg text-[#C5A46D] mb-4">Casablanca, Maroc</h3>
            <p>
              <span className="text-[#E8DFD0]/60 block text-xs">Adresse de l’agence</span>
              {settings.address || 'À configurer depuis l’espace administration'}
            </p>
            <p>
              <span className="text-[#E8DFD0]/60 block text-xs">Téléphone</span>
              <span className="tabular-nums">{settings.phone || 'À configurer depuis l’administration'}</span>
            </p>
            <p>
              <span className="text-[#E8DFD0]/60 block text-xs">E-mail</span>
              {settings.email || 'À configurer depuis l’administration'}
            </p>
            <p>
              <span className="text-[#E8DFD0]/60 block text-xs">Horaires</span>
              {settings.openingHours || 'Sur rendez-vous'}
            </p>
          </div>
        </div>

        <div className="border-t border-[#FAF9F6]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FAF9F6]/60">
            <p>© {new Date().getFullYear()} STRONG EVENT PRO · Casablanca, Maroc</p>
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setLegalModal('legal')} className="hover:text-[#C5A46D] cursor-pointer">
                Mentions légales
              </button>
              <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-[#C5A46D] cursor-pointer">
                Confidentialité
              </button>
              <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-[#C5A46D] cursor-pointer">
                Conditions
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Concierge Button */}
      <button
        type="button"
        onClick={handleWhatsappClick}
        className="fixed bottom-5 end-5 z-30 inline-flex items-center gap-2 px-4 py-3 bg-[#111111] text-[#FAF9F6] border border-[#C5A46D]/60 shadow-lg hover:bg-[#C5A46D] hover:text-[#111111] transition-colors duration-200 cursor-pointer"
        aria-label="Contacter l'agence sur WhatsApp"
      >
        <MessageCircle className="w-4 h-4 text-[#C5A46D] group-hover:text-[#111111]" />
        <span className="text-xs font-medium whitespace-nowrap">WhatsApp</span>
      </button>

      {/* Modal when WhatsApp number is not yet configured */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-[#FAF9F6] text-[#111111] max-w-md w-full p-6 border border-[#111111]/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">Messagerie WhatsApp</h3>
              <button type="button" onClick={() => setWaModalOpen(false)} className="p-1.5 hover:bg-[#E8DFD0] cursor-pointer" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#292929] leading-relaxed">
              Le numéro WhatsApp officiel de l’agence n’a pas encore été renseigné dans les paramètres administrateur. Vous pouvez nous joindre immédiatement via le formulaire de devis ou la page contact.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setWaModalOpen(false);
                  handleNav('/devis');
                }}
                className="flex-1 py-2.5 px-4 text-xs font-medium bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
              >
                Demander un devis
              </button>
              <button
                type="button"
                onClick={() => {
                  setWaModalOpen(false);
                  handleNav('/contact');
                }}
                className="flex-1 py-2.5 px-4 text-xs font-medium border border-[#111111]/20 hover:border-[#C5A46D] transition-colors cursor-pointer"
              >
                Page Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modals */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-[#FAF9F6] text-[#111111] max-w-lg w-full p-6 border border-[#111111]/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">
                {legalModal === 'legal' ? 'Mentions légales' : legalModal === 'privacy' ? 'Politique de confidentialité' : 'Conditions générales'}
              </h3>
              <button type="button" onClick={() => setLegalModal(null)} className="p-1.5 hover:bg-[#E8DFD0] cursor-pointer" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#292929] leading-relaxed whitespace-pre-line">
              {legalModal === 'legal'
                ? settings.legalMentions
                : legalModal === 'privacy'
                ? settings.privacyPolicy
                : settings.termsOfSale}
            </p>
          </div>
        </div>
      )}
      {/* First-visit Welcome Popup */}
      <WelcomeModal lang={lang} settings={settings} navigate={handleNav} ready={splashDone} />
    </div>
  );
};
