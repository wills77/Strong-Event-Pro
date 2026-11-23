/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoadingScreen } from './components/LoadingScreen';
import { TextRevealProvider } from './components/TextReveal';
import { AdminPage } from './pages/AdminPage';
import { EventsCatalogPage, PortfolioPage, ProvidersPage, ServicesPage } from './pages/CatalogPages';
import { AuthPage, ClientPortalPage } from './pages/ClientPortalPage';
import { BookingPage, QuoteFormPage } from './pages/FormsPages';
import { HomePage } from './pages/HomePage';
import { AboutPage, ContactPage, NewsPage } from './pages/InfoPages';
import type {
  AuthUser,
  EventCategory,
  FaqItem,
  Lang,
  NewsArticle,
  PortfolioItem,
  ProviderProfile,
  ReviewItem,
  ServiceItem,
  ServicePackage,
  StoreSettings,
} from './types';

interface BootstrapData {
  settings: StoreSettings;
  categories: EventCategory[];
  services: ServiceItem[];
  packages: ServicePackage[];
  providers: ProviderProfile[];
  portfolio: PortfolioItem[];
  reviews: ReviewItem[];
  articles: NewsArticle[];
  faqs: FaqItem[];
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [lang, setLang] = useState<Lang>('fr');
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [splashDone, setSplashDone] = useState<boolean>(false);

  // Auth state held strictly in memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Context prefill helpers when navigating from catalog to Quote/Booking
  const [preselectedEventType, setPreselectedEventType] = useState<string>('');
  const [preselectedServices, setPreselectedServices] = useState<string[]>([]);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Erreur de chargement serveur');
      const data = (await res.json()) as BootstrapData;
      setBootstrap(data);
      setLoadError(null);
    } catch {
      setLoadError('Impossible de charger les données de STRONG EVENT PRO.');
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('/');
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#111111] flex items-center justify-center p-6">
        <div className="max-w-md border border-[#111111]/15 bg-white p-8 space-y-4 text-center">
          <h1 className="font-display text-3xl font-semibold">STRONG EVENT PRO</h1>
          <p className="text-sm text-[#292929]">{loadError}</p>
          <button
            type="button"
            onClick={fetchBootstrap}
            className="px-6 py-2.5 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (!bootstrap) return null;
    if (currentPath.startsWith('/admin')) {
      return (
        <AdminPage
          token={token}
          user={user}
          onAuthSuccess={handleAuthSuccess}
          onPasswordChanged={() => setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev))}
          onLogout={handleLogout}
          onPublicRefresh={fetchBootstrap}
          navigate={navigate}
        />
      );
    }

    switch (currentPath) {
      case '/services':
        return (
          <ServicesPage
            services={bootstrap.services}
            packages={bootstrap.packages}
            navigate={navigate}
            onPreselectService={(name) =>
              setPreselectedServices((prev) => (prev.includes(name) ? prev : [...prev, name]))
            }
          />
        );
      case '/evenements':
        return (
          <EventsCatalogPage
            categories={bootstrap.categories}
            portfolio={bootstrap.portfolio}
            navigate={navigate}
            onSelectEventType={(name) => setPreselectedEventType(name)}
          />
        );
      case '/realisations':
        return <PortfolioPage portfolio={bootstrap.portfolio} navigate={navigate} />;
      case '/prestataires':
        return <ProvidersPage providers={bootstrap.providers} navigate={navigate} />;
      case '/devis':
        return (
          <QuoteFormPage
            categories={bootstrap.categories}
            services={bootstrap.services}
            settings={bootstrap.settings}
            user={user}
            preselectedEventType={preselectedEventType}
            preselectedServices={preselectedServices}
            navigate={navigate}
          />
        );
      case '/reserver':
        return (
          <BookingPage
            categories={bootstrap.categories}
            services={bootstrap.services}
            packages={bootstrap.packages}
            user={user}
            preselectedEventType={preselectedEventType}
            navigate={navigate}
          />
        );
      case '/a-propos':
        return <AboutPage settings={bootstrap.settings} navigate={navigate} />;
      case '/actualites':
        return <NewsPage articles={bootstrap.articles} faqs={bootstrap.faqs} />;
      case '/contact':
        return <ContactPage settings={bootstrap.settings} />;
      case '/connexion':
        return <AuthPage onAuthSuccess={handleAuthSuccess} navigate={navigate} />;
      case '/espace-client':
        if (!token || !user) {
          return <AuthPage onAuthSuccess={handleAuthSuccess} navigate={navigate} />;
        }
        return (
          <ClientPortalPage
            token={token}
            user={user}
            onUserUpdated={(updated) => setUser(updated)}
            onLogout={handleLogout}
            navigate={navigate}
          />
        );
      case '/':
      default:
        return (
          <HomePage
            lang={lang}
            settings={bootstrap.settings}
            categories={bootstrap.categories}
            services={bootstrap.services}
            packages={bootstrap.packages}
            portfolio={bootstrap.portfolio}
            reviews={bootstrap.reviews}
            navigate={navigate}
          />
        );
    }
  };

  return (
    <>
      {!splashDone && (
        <LoadingScreen
          readyToExit={Boolean(bootstrap)}
          onComplete={() => setSplashDone(true)}
        />
      )}
      {bootstrap && (
        <TextRevealProvider ready={splashDone}>
          <Layout
            currentPath={currentPath}
            navigate={navigate}
            lang={lang}
            setLang={setLang}
            settings={bootstrap.settings}
            user={user}
            splashDone={splashDone}
          >
            {renderPage()}
          </Layout>
        </TextRevealProvider>
      )}
    </>
  );
}
