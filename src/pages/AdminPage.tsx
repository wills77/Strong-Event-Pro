import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  Check,
  CreditCard,
  FileSpreadsheet,
  FolderKanban,
  Image,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { formatMad } from '../lib/i18n';
import { generateQuotePdf, generateReceiptPdf } from '../lib/pdf';
import type {
  AdminStats,
  AuthUser,
  BookingRecord,
  BookingStatus,
  ClientMessage,
  FaqItem,
  InvoiceRecord,
  ManagedEvent,
  NewsArticle,
  PaymentRecord,
  PortfolioItem,
  ProviderProfile,
  QuoteItemLine,
  QuoteRecord,
  QuoteStatus,
  ServiceItem,
  ServicePackage,
  StoreSettings,
} from '../types';

interface AdminPageProps {
  token: string | null;
  user: AuthUser | null;
  onAuthSuccess: (token: string, user: AuthUser) => void;
  onPasswordChanged: () => void;
  onLogout: () => void;
  onPublicRefresh: () => void;
  navigate: (path: string) => void;
}

type AdminSection =
  | 'overview'
  | 'bookings'
  | 'quotes'
  | 'events'
  | 'services'
  | 'customers'
  | 'providers'
  | 'portfolio'
  | 'content'
  | 'payments';

const STAGES = [
  '1. Validation du projet',
  '2. Validation du devis',
  '3. Réservation des prestataires',
  '4. Préparation logistique',
  '5. Installation',
  '6. Réalisation de l’événement',
  '7. Clôture du projet',
];

export const AdminPage: React.FC<AdminPageProps> = ({
  token,
  user,
  onAuthSuccess,
  onPasswordChanged,
  onLogout,
  onPublicRefresh,
  navigate,
}) => {
  // Login state (no exposed default credentials in frontend)
  const [loginIdent, setLoginIdent] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forced first-login password change state
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdErr, setPwdErr] = useState('');

  // Active workspace section
  const [section, setSection] = useState<AdminSection>('overview');
  const [toast, setToast] = useState('');

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [customers, setCustomers] = useState<
    { id: number; fullName: string; email: string; phone: string; company: string; city: string; notes: string; quotesCount: number; bookingsCount: number; eventsCount: number }[]
  >([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [contacts, setContacts] = useState<{ id: number; name: string; email: string; phone: string; subject: string; message: string; createdAt: string }[]>([]);
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([]);

  // Filters & interactive editor states
  const [bookingFilter, setBookingFilter] = useState('Tous');
  const [bookingSearch, setBookingSearch] = useState('');
  const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);
  const [quoteLines, setQuoteLines] = useState<QuoteItemLine[]>([]);
  const [quoteMeta, setQuoteMeta] = useState({ status: 'Devis envoyé' as QuoteStatus, extraFeesMad: 0, discountMad: 0, validityDays: 15, adminNotes: '' });
  const [newTaskTitle, setNewTaskTitle] = useState<Record<number, string>>({});
  const [newEventForm, setNewEventForm] = useState({ title: '', eventType: 'Mariages', eventDate: '', venue: '', budgetMad: 50000, projectManager: '' });
  const [newServiceForm, setNewServiceForm] = useState({ name: '', category: 'Décoration', description: '', indicativePriceMad: '', duration: 'Journée / Soirée' });
  const [newProviderForm, setNewProviderForm] = useState({ businessName: '', category: 'Traiteurs', description: '', city: 'Casablanca', phone: '', email: '', indicativePriceMad: '' });
  const [newPortfolioForm, setNewPortfolioForm] = useState({ title: '', eventType: 'Mariages', eventDate: '', city: 'Casablanca', description: '', imageUrl: '' });
  const [newPaymentForm, setNewPaymentForm] = useState({ paymentType: 'Acompte', amountMad: '', method: 'Virement bancaire', status: 'En attente', quoteId: '', notes: '' });
  const [newArticleForm, setNewArticleForm] = useState({ title: '', category: 'Conseils', excerpt: '', content: '' });
  const [newFaqForm, setNewFaqForm] = useState({ question: '', answer: '' });
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadSectionData = useCallback(async () => {
    if (!token || !user || user.role !== 'admin' || user.mustChangePassword) return;
    try {
      const [ovRes, bkRes, qtRes, evRes, srRes, cuRes, prRes, pfRes, pyRes, ctRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: authHeaders() }),
        fetch('/api/admin/bookings', { headers: authHeaders() }),
        fetch('/api/admin/quotes', { headers: authHeaders() }),
        fetch('/api/admin/events', { headers: authHeaders() }),
        fetch('/api/admin/services', { headers: authHeaders() }),
        fetch('/api/admin/customers', { headers: authHeaders() }),
        fetch('/api/admin/providers', { headers: authHeaders() }),
        fetch('/api/admin/portfolio', { headers: authHeaders() }),
        fetch('/api/admin/payments', { headers: authHeaders() }),
        fetch('/api/admin/content', { headers: authHeaders() }),
      ]);
      if (ovRes.ok) setStats(await ovRes.json());
      if (bkRes.ok) setBookings((await bkRes.json()).bookings);
      if (qtRes.ok) setQuotes((await qtRes.json()).quotes);
      if (evRes.ok) setEvents((await evRes.json()).events);
      if (srRes.ok) {
        const sData = await srRes.json();
        setServices(sData.services);
        setPackages(sData.packages);
      }
      if (cuRes.ok) setCustomers((await cuRes.json()).customers);
      if (prRes.ok) setProviders((await prRes.json()).providers);
      if (pfRes.ok) setPortfolio((await pfRes.json()).portfolio);
      if (pyRes.ok) {
        const pData = await pyRes.json();
        setPayments(pData.payments);
        setInvoices(pData.invoices);
      }
      if (ctRes.ok) {
        const cData = await ctRes.json();
        setSettings(cData.settings);
        setArticles(cData.articles);
        setFaqs(cData.faqs);
        setContacts(cData.contacts);
        setClientMessages(cData.messages);
      }
    } catch {
      notify('Erreur lors du chargement des données.');
    }
  }, [token, user, authHeaders]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdent, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginErr(data.error || 'Échec de connexion.');
        return;
      }
      if (data.user.role !== 'admin') {
        setLoginErr('Ce compte n’a pas les privilèges administrateur.');
        return;
      }
      onAuthSuccess(data.token, data.user);
      setLoginPass('');
    } catch {
      setLoginErr('Erreur serveur.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr('');
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdErr('La confirmation ne correspond pas.');
      return;
    }
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwdErr(data.error || 'Impossible de modifier le mot de passe.');
      return;
    }
    onPasswordChanged();
    notify('Mot de passe administrateur sécurisé avec succès.');
  };

  // Gate 1: Admin Auth
  if (!token || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#111111] text-[#FAF9F6] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A1A1A] border border-[#C5A46D]/35 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <BrandLogo variant="light" onClick={() => navigate('/')} />
            <Lock className="w-4 h-4 text-[#C5A46D]" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold">Administration</h1>
            <p className="text-xs text-[#E8DFD0]/70">Accès réservé à la direction STRONG EVENT PRO.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#E8DFD0]/80 mb-1.5">Identifiant ou e-mail</label>
              <input
                required
                autoComplete="username"
                value={loginIdent}
                onChange={(e) => setLoginIdent(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#111111] border border-[#FAF9F6]/20 text-[#FAF9F6] focus:border-[#C5A46D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#E8DFD0]/80 mb-1.5">Mot de passe</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#111111] border border-[#FAF9F6]/20 text-[#FAF9F6] focus:border-[#C5A46D] focus:outline-none"
              />
            </div>
            {loginErr && <p className="text-xs text-red-400">{loginErr}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-[#C5A46D] text-[#111111] text-xs font-semibold hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            >
              {loginLoading ? 'Vérification...' : 'Accéder au back-office'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-[#E8DFD0]/60 hover:text-[#C5A46D] underline cursor-pointer"
          >
            ← Retour au site public
          </button>
        </div>
      </div>
    );
  }

  // Gate 2: Mandatory first-login password change
  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#FAF9F6] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A1A1A] border border-[#C5A46D] p-8 space-y-5">
          <h1 className="font-display text-3xl font-semibold text-[#C5A46D]">Changement de mot de passe requis</h1>
          <p className="text-xs text-[#E8DFD0]/80 leading-relaxed">
            Pour sécuriser l’espace d’administration lors de la première connexion, veuillez définir un nouveau mot de passe personnel (minimum 8 caractères).
          </p>
          <form onSubmit={handleForcePasswordChange} className="space-y-4">
            <input
              required
              type="password"
              placeholder="Mot de passe actuel *"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-[#111111] border border-[#FAF9F6]/20 text-[#FAF9F6]"
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Nouveau mot de passe (8 caractères min.) *"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-[#111111] border border-[#FAF9F6]/20 text-[#FAF9F6]"
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Confirmer le nouveau mot de passe *"
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-[#111111] border border-[#FAF9F6]/20 text-[#FAF9F6]"
            />
            {pwdErr && <p className="text-xs text-red-400">{pwdErr}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-[#C5A46D] text-[#111111] text-xs font-semibold cursor-pointer"
            >
              Enregistrer et déverrouiller l’administration
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Helpers for Admin Actions
  const updateBooking = async (id: number, patch: Partial<BookingRecord>) => {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      notify('Réservation mise à jour.');
      loadSectionData();
    }
  };

  const openQuoteEditor = (q: QuoteRecord) => {
    setEditingQuote(q);
    setQuoteLines(
      q.items && q.items.length > 0
        ? q.items
        : q.selectedServices.map((name) => ({
            serviceName: name,
            description: '',
            quantity: 1,
            unitPriceMad: 0,
            totalPriceMad: 0,
          }))
    );
    setQuoteMeta({
      status: q.status,
      extraFeesMad: q.extraFeesMad,
      discountMad: q.discountMad,
      validityDays: q.validityDays,
      adminNotes: q.adminNotes,
    });
  };

  const saveQuoteBuilder = async (sendToClient: boolean) => {
    if (!editingQuote) return;
    const status = sendToClient ? 'Devis envoyé' : quoteMeta.status;
    const res = await fetch(`/api/admin/quotes/${editingQuote.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ ...quoteMeta, status, items: quoteLines }),
    });
    if (res.ok) {
      notify(sendToClient ? 'Devis envoyé au client.' : 'Devis enregistré.');
      setEditingQuote(null);
      loadSectionData();
    }
  };

  const computedQuoteSubtotal = quoteLines.reduce((acc, l) => acc + l.quantity * l.unitPriceMad, 0);
  const computedQuoteTotal = Math.max(0, computedQuoteSubtotal + quoteMeta.extraFeesMad - quoteMeta.discountMad);

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'bookings', label: 'Réservations', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'quotes', label: 'Devis', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'events', label: 'Événements & Suivi', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'services', label: 'Prestations & Packs', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'customers', label: 'Clients', icon: <Users className="w-4 h-4" /> },
    { id: 'providers', label: 'Prestataires', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'portfolio', label: 'Réalisations', icon: <Image className="w-4 h-4" /> },
    { id: 'payments', label: 'Paiements & Factures', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'content', label: 'Contenu & Paramètres', icon: <Settings className="w-4 h-4" /> },
  ];

  const filteredBookings = bookings.filter((b) => {
    const matchStatus = bookingFilter === 'Tous' || b.status === bookingFilter;
    const q = bookingSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      b.reference.toLowerCase().includes(q) ||
      b.clientName.toLowerCase().includes(q) ||
      b.eventType.toLowerCase().includes(q) ||
      b.venue.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FAF9F6] text-[#111111]">
      {/* Dark Obsidian Sidebar */}
      <aside className="lg:w-64 bg-[#111111] text-[#FAF9F6] shrink-0 flex flex-col justify-between border-e border-[#C5A46D]/20">
        <div>
          <div className="p-5 border-b border-[#FAF9F6]/10">
            <BrandLogo variant="light" onClick={() => navigate('/')} />
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                  section === item.id
                    ? 'bg-[#C5A46D] text-[#111111] font-semibold'
                    : 'text-[#E8DFD0]/80 hover:bg-[#292929] hover:text-[#FAF9F6]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-[#FAF9F6]/10 space-y-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2 text-xs text-[#E8DFD0]/75 hover:text-[#C5A46D] text-start cursor-pointer"
          >
            ← Voir le site public
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 py-2 text-xs text-red-400 hover:text-red-300 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-[#111111]/10 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#292929]/70">Administration STRONG EVENT PRO</p>
            <h1 className="font-display text-2xl font-semibold">
              {navItems.find((i) => i.id === section)?.label}
            </h1>
          </div>
          {toast && <div className="px-4 py-2 bg-[#111111] text-[#C5A46D] text-xs font-medium">{toast}</div>}
        </header>

        <div className="p-6 max-w-7xl space-y-8">
          {/* A. DASHBOARD OVERVIEW */}
          {section === 'overview' && stats && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Demandes de devis', val: stats.totalQuotes },
                  { label: 'Devis en attente', val: stats.pendingQuotes },
                  { label: 'Réservations en attente', val: stats.pendingBookings },
                  { label: 'Réservations confirmées', val: stats.confirmedBookings },
                  { label: 'Événements à venir', val: stats.upcomingEvents },
                  { label: 'Événements terminés', val: stats.completedEvents },
                  { label: 'Clients enregistrés', val: stats.totalCustomers },
                  { label: 'Prestataires actifs / total', val: `${stats.approvedProviders} / ${stats.totalProviders}` },
                  { label: 'Chiffre d’affaires confirmé', val: formatMad(stats.confirmedRevenueMad) },
                  { label: 'Paiements reçus', val: stats.receivedPaymentsCount },
                  { label: 'Soldes en attente', val: formatMad(stats.pendingPaymentsMad) },
                  { label: 'Total réservations', val: stats.totalBookings },
                ].map((k) => (
                  <div key={k.label} className="bg-white border border-[#111111]/12 p-4">
                    <div className="text-xs text-[#292929]/75">{k.label}</div>
                    <div className="font-mono-num text-xl font-semibold mt-1 text-[#111111]">{k.val}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                  <h2 className="font-display text-xl font-semibold">Réservations par mois</h2>
                  {stats.bookingsByMonth.length === 0 ? (
                    <p className="text-xs text-[#292929]">Aucune réservation datée.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {stats.bookingsByMonth.map((row) => (
                        <div key={row.month} className="flex items-center gap-3 text-xs">
                          <span className="font-mono-num w-20 text-[#292929]">{row.month}</span>
                          <div className="flex-1 bg-[#FAF9F6] h-5 border border-[#111111]/10">
                            <div
                              className="bg-[#111111] h-full"
                              style={{ width: `${Math.min(100, row.count * 25)}%` }}
                            />
                          </div>
                          <span className="font-mono-num w-8 text-end font-semibold">{row.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                  <h2 className="font-display text-xl font-semibold">Chiffre d’affaires confirmé (MAD)</h2>
                  {stats.revenueByMonth.length === 0 ? (
                    <p className="text-xs text-[#292929]">
                      Aucun paiement confirmé pour le moment (les revenus s’affichent uniquement après confirmation réelle dans Paiements).
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {stats.revenueByMonth.map((row) => (
                        <div key={row.month} className="flex items-center gap-3 text-xs">
                          <span className="font-mono-num w-20 text-[#292929]">{row.month}</span>
                          <div className="flex-1 bg-[#FAF9F6] h-5 border border-[#111111]/10">
                            <div className="bg-[#C5A46D] h-full" style={{ width: '100%' }} />
                          </div>
                          <span className="font-mono-num font-semibold">{formatMad(row.amountMad)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold">Journal des activités administrateur</h2>
                <div className="divide-y divide-[#111111]/10 text-xs">
                  {stats.recentActivities.map((act) => (
                    <div key={act.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                      <div>
                        <span className="font-semibold">{act.adminName}</span> — {act.action}{' '}
                        {act.details && <span className="text-[#292929]/75">({act.details})</span>}
                      </div>
                      <span className="font-mono-num text-[#292929]/60">{act.createdAt.replace('T', ' ').slice(0, 16)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* B. BOOKINGS */}
          {section === 'bookings' && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <input
                  placeholder="Rechercher référence, client, lieu..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-white border border-[#111111]/20 w-72"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['Tous', 'En attente', 'En cours de confirmation', 'Confirmée', 'En préparation', 'Terminée', 'Annulée'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBookingFilter(st)}
                      className={`px-3 py-1.5 text-xs border cursor-pointer ${
                        bookingFilter === st ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]' : 'bg-white border-[#111111]/15'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredBookings.map((b) => (
                  <div key={b.id} className="bg-white border border-[#111111]/12 p-5 space-y-4">
                    <div className="flex flex-wrap justify-between gap-4">
                      <div className="space-y-1">
                        <span className="font-mono-num text-xs text-[#C5A46D]">{b.reference}</span>
                        <h3 className="font-display text-xl font-semibold">
                          {b.eventType} — {b.clientName}
                        </h3>
                        <p className="text-xs text-[#292929]">
                          {b.clientEmail} · {b.clientPhone} · <span className="font-mono-num">{b.eventDate}</span> ({b.timeSlot}) · {b.venue}
                        </p>
                        <p className="text-xs text-[#292929]/75">
                          {b.guestCount} invités · Prestations : {b.selectedServices.join(', ') || 'Aucune'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start">
                        <select
                          value={b.status}
                          onChange={(e) => updateBooking(b.id, { status: e.target.value as BookingStatus })}
                          className="px-3 py-1.5 text-xs border border-[#111111]/25 bg-[#FAF9F6]"
                        >
                          {['En attente', 'En cours de confirmation', 'Confirmée', 'En préparation', 'En cours de réalisation', 'Terminée', 'Annulée'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {b.status !== 'Confirmée' && (
                          <button
                            type="button"
                            onClick={() => updateBooking(b.id, { status: 'Confirmée' })}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                          >
                            Confirmer & Créer projet
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#111111]/10">
                      <input
                        defaultValue={b.assignedManager}
                        placeholder="Responsable affecté (Entrée pour sauvegarder)"
                        onBlur={(e) => {
                          if (e.target.value !== b.assignedManager) updateBooking(b.id, { assignedManager: e.target.value });
                        }}
                        className="px-3 py-1.5 text-xs border border-[#111111]/15 bg-[#FAF9F6]"
                      />
                      <input
                        defaultValue={b.internalComments}
                        placeholder="Commentaires internes équipe"
                        onBlur={(e) => {
                          if (e.target.value !== b.internalComments) updateBooking(b.id, { internalComments: e.target.value });
                        }}
                        className="px-3 py-1.5 text-xs border border-[#111111]/15 bg-[#FAF9F6]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. QUOTES BUILDER */}
          {section === 'quotes' && (
            <div className="space-y-6">
              {editingQuote ? (
                <div className="bg-white border border-[#C5A46D] p-6 space-y-6">
                  <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#111111]/10 pb-4">
                    <div>
                      <span className="font-mono-num text-xs text-[#C5A46D]">{editingQuote.reference}</span>
                      <h2 className="font-display text-2xl font-semibold">
                        Éditeur de devis — {editingQuote.clientName} ({editingQuote.eventType})
                      </h2>
                    </div>
                    <button type="button" onClick={() => setEditingQuote(null)} className="text-xs underline cursor-pointer">
                      Retour à la liste
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold">Lignes de prestations (MAD)</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setQuoteLines([...quoteLines, { serviceName: 'Nouvelle prestation', description: '', quantity: 1, unitPriceMad: 0, totalPriceMad: 0 }])
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-[#111111]/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                      </button>
                    </div>
                    {quoteLines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <input
                          value={line.serviceName}
                          onChange={(e) => {
                            const copy = [...quoteLines];
                            copy[idx].serviceName = e.target.value;
                            setQuoteLines(copy);
                          }}
                          placeholder="Prestation"
                          className="md:col-span-4 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                        />
                        <input
                          value={line.description}
                          onChange={(e) => {
                            const copy = [...quoteLines];
                            copy[idx].description = e.target.value;
                            setQuoteLines(copy);
                          }}
                          placeholder="Détail"
                          className="md:col-span-3 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                        />
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => {
                            const copy = [...quoteLines];
                            copy[idx].quantity = Math.max(1, Number(e.target.value));
                            copy[idx].totalPriceMad = copy[idx].quantity * copy[idx].unitPriceMad;
                            setQuoteLines(copy);
                          }}
                          className="md:col-span-1 px-2 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                        />
                        <input
                          type="number"
                          min={0}
                          value={line.unitPriceMad}
                          onChange={(e) => {
                            const copy = [...quoteLines];
                            copy[idx].unitPriceMad = Math.max(0, Number(e.target.value));
                            copy[idx].totalPriceMad = copy[idx].quantity * copy[idx].unitPriceMad;
                            setQuoteLines(copy);
                          }}
                          className="md:col-span-2 px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                        />
                        <div className="md:col-span-1 text-end font-mono-num text-xs font-semibold">
                          {(line.quantity * line.unitPriceMad).toLocaleString('fr-FR')}
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuoteLines(quoteLines.filter((_, i) => i !== idx))}
                          className="md:col-span-1 text-red-700 flex justify-end cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-[#111111]/10">
                    <div>
                      <label className="block text-xs text-[#292929] mb-1">Statut</label>
                      <select
                        value={quoteMeta.status}
                        onChange={(e) => setQuoteMeta({ ...quoteMeta, status: e.target.value as QuoteStatus })}
                        className="w-full px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                      >
                        {['Nouvelle demande', "En cours d'étude", 'Devis envoyé', 'En attente de validation', 'Accepté', 'Refusé', 'Terminé'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#292929] mb-1">Frais supplémentaires (MAD)</label>
                      <input
                        type="number"
                        value={quoteMeta.extraFeesMad}
                        onChange={(e) => setQuoteMeta({ ...quoteMeta, extraFeesMad: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#292929] mb-1">Remise (MAD)</label>
                      <input
                        type="number"
                        value={quoteMeta.discountMad}
                        onChange={(e) => setQuoteMeta({ ...quoteMeta, discountMad: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#292929] mb-1">Validité (jours)</label>
                      <input
                        type="number"
                        value={quoteMeta.validityDays}
                        onChange={(e) => setQuoteMeta({ ...quoteMeta, validityDays: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#111111]/10">
                    <div className="font-mono-num text-xl font-semibold">
                      Total calculé : <span className="text-[#C5A46D]">{formatMad(computedQuoteTotal)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          generateQuotePdf({
                            ...editingQuote,
                            ...quoteMeta,
                            items: quoteLines,
                            totalAmountMad: computedQuoteTotal,
                          })
                        }
                        className="px-4 py-2 text-xs border border-[#111111]/20 cursor-pointer"
                      >
                        Aperçu PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => saveQuoteBuilder(false)}
                        className="px-4 py-2 text-xs border border-[#111111] font-medium cursor-pointer"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => saveQuoteBuilder(true)}
                        className="px-5 py-2 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                      >
                        Envoyer au client
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((q) => (
                    <div key={q.id} className="bg-white border border-[#111111]/12 p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="font-mono-num text-xs text-[#C5A46D]">{q.reference}</span>
                        <h3 className="font-display text-xl font-semibold">
                          {q.eventType} — {q.clientName}
                        </h3>
                        <p className="text-xs text-[#292929]">
                          {q.eventDate} · {q.guestCount} convives · Budget : {q.estimatedBudgetMad} · Statut :{' '}
                          <strong>{q.status}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-num text-sm font-semibold">{formatMad(q.totalAmountMad)}</span>
                        <button
                          type="button"
                          onClick={() => openQuoteEditor(q)}
                          className="px-4 py-2 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                        >
                          Chiffrer / Modifier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* D. EVENTS & 7-STAGE CHECKLIST */}
          {section === 'events' && (
            <div className="space-y-8">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/events', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify(newEventForm),
                  });
                  if (res.ok) {
                    notify('Événement ajouté.');
                    setNewEventForm({ title: '', eventType: 'Mariages', eventDate: '', venue: '', budgetMad: 50000, projectManager: '' });
                    loadSectionData();
                  }
                }}
                className="bg-white border border-[#111111]/12 p-6 grid grid-cols-1 sm:grid-cols-6 gap-3"
              >
                <input
                  required
                  placeholder="Nom de l'événement *"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  required
                  type="date"
                  value={newEventForm.eventDate}
                  onChange={(e) => setNewEventForm({ ...newEventForm, eventDate: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  required
                  placeholder="Lieu *"
                  value={newEventForm.venue}
                  onChange={(e) => setNewEventForm({ ...newEventForm, venue: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  type="number"
                  placeholder="Budget MAD"
                  value={newEventForm.budgetMad}
                  onChange={(e) => setNewEventForm({ ...newEventForm, budgetMad: Number(e.target.value) })}
                  className="px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer">
                  + Créer projet
                </button>
              </form>

              {events.map((ev) => (
                <div key={ev.id} className="bg-white border border-[#111111]/12 p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl font-semibold">{ev.title}</h3>
                      <p className="text-xs text-[#292929]">
                        {ev.eventType} · <span className="font-mono-num">{ev.eventDate}</span> · {ev.venue} · Budget :{' '}
                        <span className="font-mono-num font-semibold">{formatMad(ev.budgetMad)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={ev.currentStage}
                        onChange={async (e) => {
                          await fetch(`/api/admin/events/${ev.id}`, {
                            method: 'PUT',
                            headers: authHeaders(),
                            body: JSON.stringify({
                              currentStage: Number(e.target.value),
                              status: Number(e.target.value) === 7 ? 'Clôturé' : 'En préparation',
                            }),
                          });
                          loadSectionData();
                        }}
                        className="px-3 py-1.5 text-xs border border-[#111111]/25 bg-[#FAF9F6]"
                      >
                        {STAGES.map((s, idx) => (
                          <option key={s} value={idx + 1}>{s}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE', headers: authHeaders() });
                          loadSectionData();
                        }}
                        className="p-2 text-red-700 hover:bg-red-50 cursor-pointer"
                        aria-label="Supprimer événement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tasks checklist */}
                  <div className="pt-4 border-t border-[#111111]/10 space-y-3">
                    <p className="text-xs font-semibold">Checklist de tâches</p>
                    <div className="space-y-1.5">
                      {(ev.tasks || []).map((tk) => (
                        <div key={tk.id} className="flex items-center justify-between text-xs bg-[#FAF9F6] px-3 py-2 border border-[#111111]/10">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tk.isDone}
                              onChange={async (e) => {
                                await fetch(`/api/admin/tasks/${tk.id}`, {
                                  method: 'PUT',
                                  headers: authHeaders(),
                                  body: JSON.stringify({ isDone: e.target.checked }),
                                });
                                loadSectionData();
                              }}
                            />
                            <span className={tk.isDone ? 'line-through text-[#292929]/60' : ''}>{tk.title}</span>
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/tasks/${tk.id}`, { method: 'DELETE', headers: authHeaders() });
                              loadSectionData();
                            }}
                            className="text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        placeholder="Nouvelle tâche..."
                        value={newTaskTitle[ev.id] || ''}
                        onChange={(e) => setNewTaskTitle({ ...newTaskTitle, [ev.id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const title = newTaskTitle[ev.id];
                          if (!title) return;
                          await fetch(`/api/admin/events/${ev.id}/tasks`, {
                            method: 'POST',
                            headers: authHeaders(),
                            body: JSON.stringify({ title, stage: ev.currentStage }),
                          });
                          setNewTaskTitle({ ...newTaskTitle, [ev.id]: '' });
                          loadSectionData();
                        }}
                        className="px-4 py-1.5 bg-[#111111] text-[#FAF9F6] text-xs cursor-pointer"
                      >
                        Ajouter tâche
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* E. SERVICES & PACKAGES */}
          {section === 'services' && (
            <div className="space-y-8">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/services', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                      ...newServiceForm,
                      indicativePriceMad: newServiceForm.indicativePriceMad ? Number(newServiceForm.indicativePriceMad) : null,
                    }),
                  });
                  if (res.ok) {
                    notify('Prestation ajoutée.');
                    setNewServiceForm({ name: '', category: 'Décoration', description: '', indicativePriceMad: '', duration: 'Journée / Soirée' });
                    loadSectionData();
                    onPublicRefresh();
                  }
                }}
                className="bg-white border border-[#111111]/12 p-6 grid grid-cols-1 sm:grid-cols-5 gap-3"
              >
                <input
                  required
                  placeholder="Nom prestation *"
                  value={newServiceForm.name}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <select
                  value={newServiceForm.category}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, category: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                >
                  {['Décoration', 'Restauration', 'Sonorisation & Animation', 'Photo & Vidéo', 'Logistique', 'Communication'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Tarif MAD"
                  value={newServiceForm.indicativePriceMad}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, indicativePriceMad: e.target.value })}
                  className="px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer">
                  + Ajouter service
                </button>
                <input
                  required
                  placeholder="Description détaillée *"
                  value={newServiceForm.description}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                  className="sm:col-span-5 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </form>

              <div className="bg-white border border-[#111111]/12 divide-y divide-[#111111]/10">
                {services.map((s) => (
                  <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-[#292929]/75">{s.category} · {s.priceLabel}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/services/${s.id}`, {
                            method: 'PUT',
                            headers: authHeaders(),
                            body: JSON.stringify({ isActive: !s.isActive }),
                          });
                          loadSectionData();
                          onPublicRefresh();
                        }}
                        className={`px-3 py-1 border cursor-pointer ${s.isActive ? 'bg-[#111111] text-[#FAF9F6]' : 'bg-[#FAF9F6]'}`}
                      >
                        {s.isActive ? 'Actif' : 'Désactivé'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/services/${s.id}`, { method: 'DELETE', headers: authHeaders() });
                          loadSectionData();
                          onPublicRefresh();
                        }}
                        className="text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                <h2 className="font-display text-2xl font-semibold">Tarifs des Formules (MAD)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((p) => (
                    <div key={p.id} className="border border-[#111111]/15 p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{p.name}</div>
                        <div className="text-xs text-[#292929]/75">{p.subtitle}</div>
                      </div>
                      <input
                        type="number"
                        defaultValue={p.indicativePriceMad ?? ''}
                        placeholder="Sur devis"
                        onBlur={async (e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          await fetch(`/api/admin/packages/${p.id}`, {
                            method: 'PUT',
                            headers: authHeaders(),
                            body: JSON.stringify({ indicativePriceMad: val }),
                          });
                          notify('Tarif formule enregistré.');
                          onPublicRefresh();
                        }}
                        className="w-32 px-3 py-1.5 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* F. CUSTOMERS */}
          {section === 'customers' && (
            <div className="bg-white border border-[#111111]/12 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#111111]/10 bg-[#FAF9F6] text-[#292929]">
                    <th className="p-3 text-start">Client</th>
                    <th className="p-3 text-start">Contact</th>
                    <th className="p-3 text-start">Ville</th>
                    <th className="p-3 text-end">Devis</th>
                    <th className="p-3 text-end">Réservations</th>
                    <th className="p-3 text-end">Événements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111111]/10">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-semibold">{c.fullName}</td>
                      <td className="p-3">{c.email} {c.phone && `· ${c.phone}`}</td>
                      <td className="p-3">{c.city}</td>
                      <td className="p-3 text-end font-mono-num">{c.quotesCount}</td>
                      <td className="p-3 text-end font-mono-num">{c.bookingsCount}</td>
                      <td className="p-3 text-end font-mono-num">{c.eventsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* G. PROVIDERS */}
          {section === 'providers' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/providers', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                      ...newProviderForm,
                      indicativePriceMad: newProviderForm.indicativePriceMad ? Number(newProviderForm.indicativePriceMad) : null,
                    }),
                  });
                  if (res.ok) {
                    notify('Prestataire ajouté.');
                    setNewProviderForm({ businessName: '', category: 'Traiteurs', description: '', city: 'Casablanca', phone: '', email: '', indicativePriceMad: '' });
                    loadSectionData();
                    onPublicRefresh();
                  }
                }}
                className="bg-white border border-[#111111]/12 p-6 grid grid-cols-1 sm:grid-cols-5 gap-3"
              >
                <input
                  required
                  placeholder="Nom commercial *"
                  value={newProviderForm.businessName}
                  onChange={(e) => setNewProviderForm({ ...newProviderForm, businessName: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <select
                  value={newProviderForm.category}
                  onChange={(e) => setNewProviderForm({ ...newProviderForm, category: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                >
                  {['Traiteurs', 'Décorateurs', 'Photographes', 'Vidéastes', 'DJ', 'Musiciens', 'Loueurs de salles', 'Fleuristes', 'Animateurs'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  placeholder="Tarif indicatif MAD"
                  type="number"
                  value={newProviderForm.indicativePriceMad}
                  onChange={(e) => setNewProviderForm({ ...newProviderForm, indicativePriceMad: e.target.value })}
                  className="px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer">
                  + Ajouter prestataire
                </button>
                <input
                  required
                  placeholder="Description *"
                  value={newProviderForm.description}
                  onChange={(e) => setNewProviderForm({ ...newProviderForm, description: e.target.value })}
                  className="sm:col-span-5 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </form>

              <div className="bg-white border border-[#111111]/12 divide-y divide-[#111111]/10">
                {providers.map((pr) => (
                  <div key={pr.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-sm">{pr.businessName}</div>
                      <div className="text-[#292929]/75">{pr.category} · {pr.city} · Statut : <strong>{pr.validationStatus}</strong></div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pr.validationStatus !== 'approved' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/providers/${pr.id}`, {
                              method: 'PUT',
                              headers: authHeaders(),
                              body: JSON.stringify({ validationStatus: 'approved' }),
                            });
                            loadSectionData();
                            onPublicRefresh();
                          }}
                          className="px-3 py-1 bg-[#111111] text-[#FAF9F6] cursor-pointer"
                        >
                          Valider
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/providers/${pr.id}`, {
                            method: 'PUT',
                            headers: authHeaders(),
                            body: JSON.stringify({ validationStatus: pr.validationStatus === 'disabled' ? 'approved' : 'disabled' }),
                          });
                          loadSectionData();
                          onPublicRefresh();
                        }}
                        className="px-3 py-1 border border-[#111111]/20 cursor-pointer"
                      >
                        {pr.validationStatus === 'disabled' ? 'Activer' : 'Désactiver'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/providers/${pr.id}`, { method: 'DELETE', headers: authHeaders() });
                          loadSectionData();
                          onPublicRefresh();
                        }}
                        className="text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* H. PORTFOLIO */}
          {section === 'portfolio' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/portfolio', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                      ...newPortfolioForm,
                      galleryUrls: newPortfolioForm.imageUrl ? [newPortfolioForm.imageUrl] : [],
                      isDemo: false,
                    }),
                  });
                  if (res.ok) {
                    notify('Réalisation publiée.');
                    setNewPortfolioForm({ title: '', eventType: 'Mariages', eventDate: '', city: 'Casablanca', description: '', imageUrl: '' });
                    loadSectionData();
                    onPublicRefresh();
                  }
                }}
                className="bg-white border border-[#111111]/12 p-6 grid grid-cols-1 sm:grid-cols-4 gap-3"
              >
                <input
                  required
                  placeholder="Titre du projet *"
                  value={newPortfolioForm.title}
                  onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, title: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  placeholder="Type d'événement"
                  value={newPortfolioForm.eventType}
                  onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, eventType: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  type="date"
                  value={newPortfolioForm.eventDate}
                  onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, eventDate: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="Description *"
                  value={newPortfolioForm.description}
                  onChange={(e) => setNewPortfolioForm({ ...newPortfolioForm, description: e.target.value })}
                  className="sm:col-span-3 px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer">
                  + Publier réalisation
                </button>
              </form>

              <div className="bg-white border border-[#111111]/12 divide-y divide-[#111111]/10">
                {portfolio.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-sm">{p.title}</div>
                      <div className="text-[#292929]/75">{p.eventType} · {p.city} · {p.eventDate}</div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/portfolio/${p.id}`, { method: 'DELETE', headers: authHeaders() });
                        loadSectionData();
                        onPublicRefresh();
                      }}
                      className="text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* J. PAYMENTS & INVOICES */}
          {section === 'payments' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/payments', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                      ...newPaymentForm,
                      amountMad: Number(newPaymentForm.amountMad),
                      quoteId: newPaymentForm.quoteId ? Number(newPaymentForm.quoteId) : null,
                    }),
                  });
                  if (res.ok) {
                    notify('Paiement enregistré.');
                    setNewPaymentForm({ paymentType: 'Acompte', amountMad: '', method: 'Virement bancaire', status: 'En attente', quoteId: '', notes: '' });
                    loadSectionData();
                  }
                }}
                className="bg-white border border-[#111111]/12 p-6 grid grid-cols-1 sm:grid-cols-6 gap-3"
              >
                <select
                  value={newPaymentForm.paymentType}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, paymentType: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                >
                  <option value="Acompte">Acompte</option>
                  <option value="Complément">Complément</option>
                  <option value="Solde">Solde</option>
                </select>
                <input
                  required
                  type="number"
                  placeholder="Montant MAD *"
                  value={newPaymentForm.amountMad}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amountMad: e.target.value })}
                  className="px-3 py-2 text-xs font-mono-num border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <input
                  placeholder="Mode (Virement, Chèque...)"
                  value={newPaymentForm.method}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, method: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <select
                  value={newPaymentForm.status}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, status: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                >
                  <option value="En attente">En attente</option>
                  <option value="Confirmé">Confirmé (reçu vérifié)</option>
                </select>
                <select
                  value={newPaymentForm.quoteId}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, quoteId: e.target.value })}
                  className="px-3 py-2 text-xs border border-[#111111]/20 bg-[#FAF9F6]"
                >
                  <option value="">Associer à un devis (optionnel)</option>
                  {quotes.map((q) => (
                    <option key={q.id} value={q.id}>{q.reference} — {q.clientName}</option>
                  ))}
                </select>
                <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer">
                  + Enregistrer
                </button>
              </form>

              <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold">Transactions & Confirmation manuelle</h2>
                {payments.length === 0 ? (
                  <p className="text-xs text-[#292929]">Aucun paiement enregistré.</p>
                ) : (
                  <div className="divide-y divide-[#111111]/10 text-xs">
                    {payments.map((pay) => (
                      <div key={pay.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="font-mono-num font-semibold">{pay.reference}</span> · {pay.paymentType} ({pay.method}) ·{' '}
                          <strong>{pay.status}</strong>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono-num font-semibold">{formatMad(pay.amountMad)}</span>
                          {pay.status === 'En attente' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/payments/${pay.id}/confirm`, { method: 'PUT', headers: authHeaders() });
                                notify('Paiement confirmé.');
                                loadSectionData();
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#111111] text-[#FAF9F6] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Confirmer réception
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => generateReceiptPdf(pay)}
                              className="px-3 py-1 border border-[#111111]/20 cursor-pointer"
                            >
                              Reçu PDF
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold">Suivi des factures & soldes</h2>
                <div className="divide-y divide-[#111111]/10 text-xs">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                      <span className="font-mono-num font-semibold">{inv.invoiceNumber}</span>
                      <span className="font-mono-num">
                        Total : {formatMad(inv.totalMad)} · Payé : {formatMad(inv.paidMad)} · Reste : {formatMad(inv.remainingMad)} ({inv.status})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* I. CONTENT & SETTINGS */}
          {section === 'content' && settings && (
            <div className="space-y-8">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: authHeaders(),
                    body: JSON.stringify(settings),
                  });
                  if (res.ok) {
                    notify('Paramètres et contenus enregistrés.');
                    onPublicRefresh();
                  }
                }}
                className="bg-white border border-[#111111]/12 p-6 space-y-5"
              >
                <h2 className="font-display text-2xl font-semibold">Identité, Coordonnées, Google Maps & Notifications</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[#292929] mb-1">Titre Hero</label>
                    <input
                      value={settings.heroTitle}
                      onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">Sous-titre Hero</label>
                    <input
                      value={settings.heroSubtitle}
                      onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">Adresse agence (Casablanca)</label>
                    <input
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      placeholder="Saisissez votre adresse officielle"
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">Téléphone</label>
                    <input
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="+212 ..."
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">WhatsApp Business (avec indicatif pays)</label>
                    <input
                      value={settings.whatsappNumber}
                      onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      placeholder="+2126..."
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">E-mail de contact</label>
                    <input
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="contact@..."
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">URL Embed Google Maps (https://www.google.com/maps/embed...)</label>
                    <input
                      value={settings.googleMapsEmbedUrl}
                      onChange={(e) => setSettings({ ...settings, googleMapsEmbedUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#292929] mb-1">Horaires d’ouverture</label>
                    <input
                      value={settings.openingHours}
                      onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[#292929] mb-1">Texte À propos</label>
                    <textarea
                      rows={3}
                      value={settings.aboutText}
                      onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20 bg-[#FAF9F6]"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.emailNotificationsEnabled}
                      onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                    />
                    <span>Activer dispatch notifications E-mail (nécessite variables SMTP serveur)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.whatsappNotificationsEnabled}
                      onChange={(e) => setSettings({ ...settings, whatsappNotificationsEnabled: e.target.checked })}
                    />
                    <span>Activer dispatch notifications WhatsApp API (nécessite token serveur)</span>
                  </label>
                </div>
                <button type="submit" className="px-6 py-2.5 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer">
                  Enregistrer les paramètres
                </button>
              </form>

              {/* Articles & FAQs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                  <h3 className="font-display text-xl font-semibold">Actualités ({articles.length})</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await fetch('/api/admin/articles', {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify(newArticleForm),
                      });
                      setNewArticleForm({ title: '', category: 'Conseils', excerpt: '', content: '' });
                      loadSectionData();
                      onPublicRefresh();
                    }}
                    className="space-y-2 text-xs"
                  >
                    <input
                      required
                      placeholder="Titre article"
                      value={newArticleForm.title}
                      onChange={(e) => setNewArticleForm({ ...newArticleForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20"
                    />
                    <input
                      required
                      placeholder="Résumé court"
                      value={newArticleForm.excerpt}
                      onChange={(e) => setNewArticleForm({ ...newArticleForm, excerpt: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20"
                    />
                    <textarea
                      required
                      rows={2}
                      placeholder="Contenu complet"
                      value={newArticleForm.content}
                      onChange={(e) => setNewArticleForm({ ...newArticleForm, content: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20"
                    />
                    <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] cursor-pointer">Publier article</button>
                  </form>
                  <div className="divide-y divide-[#111111]/10 text-xs">
                    {articles.map((a) => (
                      <div key={a.id} className="py-2 flex justify-between items-center">
                        <span>{a.title}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/articles/${a.id}`, { method: 'DELETE', headers: authHeaders() });
                            loadSectionData();
                            onPublicRefresh();
                          }}
                          className="text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                  <h3 className="font-display text-xl font-semibold">FAQ ({faqs.length})</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await fetch('/api/admin/faqs', {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify(newFaqForm),
                      });
                      setNewFaqForm({ question: '', answer: '' });
                      loadSectionData();
                      onPublicRefresh();
                    }}
                    className="space-y-2 text-xs"
                  >
                    <input
                      required
                      placeholder="Question"
                      value={newFaqForm.question}
                      onChange={(e) => setNewFaqForm({ ...newFaqForm, question: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20"
                    />
                    <textarea
                      required
                      rows={2}
                      placeholder="Réponse"
                      value={newFaqForm.answer}
                      onChange={(e) => setNewFaqForm({ ...newFaqForm, answer: e.target.value })}
                      className="w-full px-3 py-2 border border-[#111111]/20"
                    />
                    <button type="submit" className="px-4 py-2 bg-[#111111] text-[#FAF9F6] cursor-pointer">Ajouter FAQ</button>
                  </form>
                  <div className="divide-y divide-[#111111]/10 text-xs">
                    {faqs.map((f) => (
                      <div key={f.id} className="py-2 flex justify-between items-center">
                        <span>{f.question}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/faqs/${f.id}`, { method: 'DELETE', headers: authHeaders() });
                            loadSectionData();
                            onPublicRefresh();
                          }}
                          className="text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact & Client Messages */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#111111]/12 p-6 space-y-3">
                  <h3 className="font-display text-xl font-semibold">Messages Page Contact ({contacts.length})</h3>
                  {contacts.map((c) => (
                    <div key={c.id} className="border-b border-[#111111]/10 pb-2 text-xs space-y-1">
                      <div className="font-semibold">{c.name} ({c.email}) — {c.subject}</div>
                      <p className="text-[#292929]">{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-[#111111]/12 p-6 space-y-3">
                  <h3 className="font-display text-xl font-semibold">Messagerie Espace Client ({clientMessages.length})</h3>
                  {clientMessages
                    .filter((m) => m.senderRole === 'client')
                    .map((m) => (
                      <div key={m.id} className="border-b border-[#111111]/10 pb-3 text-xs space-y-2">
                        <div className="font-semibold">{m.senderName} — {m.subject}</div>
                        <p>{m.body}</p>
                        <div className="flex gap-2">
                          <input
                            placeholder="Répondre au client..."
                            value={replyText[m.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [m.id]: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 border border-[#111111]/20"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!replyText[m.id]) return;
                              await fetch('/api/admin/messages/reply', {
                                method: 'POST',
                                headers: authHeaders(),
                                body: JSON.stringify({ userId: m.userId, subject: `Re: ${m.subject}`, body: replyText[m.id] }),
                              });
                              setReplyText({ ...replyText, [m.id]: '' });
                              notify('Réponse envoyée.');
                              loadSectionData();
                            }}
                            className="px-3 py-1.5 bg-[#111111] text-[#FAF9F6] cursor-pointer"
                          >
                            Répondre
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
