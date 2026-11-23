import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Download, FileText, LogOut, MessageSquare, User } from 'lucide-react';
import { TextReveal } from '../components/TextReveal';
import { formatMad } from '../lib/i18n';
import { generateQuotePdf, generateReceiptPdf } from '../lib/pdf';
import type {
  AuthUser,
  BookingRecord,
  ClientMessage,
  InvoiceRecord,
  ManagedEvent,
  NotificationItem,
  PaymentRecord,
  QuoteRecord,
} from '../types';

/* ---------------- CLIENT AUTH PAGE ---------------- */
interface AuthPageProps {
  onAuthSuccess: (token: string, user: AuthUser) => void;
  navigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, navigate }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    city: 'Casablanca',
    company: '',
    role: 'client' as 'client' | 'provider',
    resetToken: '',
    newPassword: '',
  });
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [localResetCode, setLocalResetCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Connexion impossible.');
        return;
      }
      onAuthSuccess(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/espace-client');
    } catch {
      setError('Erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Inscription impossible.');
        return;
      }
      onAuthSuccess(data.token, data.user);
      navigate('/espace-client');
    } catch {
      setError('Erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          resetToken: form.resetToken || undefined,
          newPassword: form.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur de réinitialisation.');
        return;
      }
      setInfoMsg(data.message);
      if (data.localResetCode) setLocalResetCode(data.localResetCode);
      if (form.resetToken && form.newPassword) {
        setMode('login');
      }
    } catch {
      setError('Erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-white border border-[#111111]/15 p-8 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Espace Personnel Sécurisé</p>
          <TextReveal
            as="h1"
            tone="light"
            text={mode === 'login' ? 'Connexion Client' : mode === 'register' ? 'Créer un compte' : 'Réinitialiser le mot de passe'}
            className="font-display text-3xl font-semibold"
          />
        </div>

        <div className="flex border border-[#111111]/15 p-0.5 bg-[#FAF9F6]">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium cursor-pointer ${mode === 'login' ? 'bg-[#111111] text-[#FAF9F6]' : 'text-[#292929]'}`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium cursor-pointer ${mode === 'register' ? 'bg-[#111111] text-[#FAF9F6]' : 'text-[#292929]'}`}
          >
            Inscription
          </button>
          <button
            type="button"
            onClick={() => { setMode('reset'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium cursor-pointer ${mode === 'reset' ? 'bg-[#111111] text-[#FAF9F6]' : 'text-[#292929]'}`}
          >
            Mot de passe
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1">Adresse e-mail</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1">Mot de passe</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
            </div>
            {error && <p className="text-xs text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <input
              required
              placeholder="Nom & prénom *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            <input
              required
              type="email"
              placeholder="Adresse e-mail *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            <input
              placeholder="Téléphone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Ville"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'client' | 'provider' })}
                className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              >
                <option value="client">Compte Client</option>
                <option value="provider">Compte Prestataire</option>
              </select>
            </div>
            <input
              required
              type="password"
              minLength={8}
              placeholder="Mot de passe (8 caractères min.) *"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            {error && <p className="text-xs text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              required
              type="email"
              placeholder="Votre adresse e-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            {localResetCode && (
              <div className="p-3 bg-[#E8DFD0]/60 text-xs space-y-2">
                <p>Code de réinitialisation généré : <span className="font-mono-num font-semibold">{localResetCode}</span></p>
                <input
                  placeholder="Coller le code de réinitialisation"
                  value={form.resetToken}
                  onChange={(e) => setForm({ ...form, resetToken: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#111111]/20"
                />
                <input
                  type="password"
                  minLength={8}
                  placeholder="Nouveau mot de passe (8 caractères min.)"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#111111]/20"
                />
              </div>
            )}
            {infoMsg && <p className="text-xs text-[#111111] font-medium">{infoMsg}</p>}
            {error && <p className="text-xs text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold cursor-pointer"
            >
              {localResetCode ? 'Valider le nouveau mot de passe' : 'Demander la réinitialisation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* ---------------- CLIENT PORTAL DASHBOARD ---------------- */
interface ClientPortalPageProps {
  token: string;
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
  navigate: (path: string) => void;
}

const EVENT_STAGES = [
  '1. Validation du projet',
  '2. Validation du devis',
  '3. Réservation des prestataires',
  '4. Préparation logistique',
  '5. Installation',
  '6. Réalisation de l’événement',
  '7. Clôture du projet',
];

export const ClientPortalPage: React.FC<ClientPortalPageProps> = ({
  token,
  user,
  onUserUpdated,
  onLogout,
  navigate,
}) => {
  const [tab, setTab] = useState<'overview' | 'quotes' | 'bookings' | 'tracking' | 'invoices' | 'messages' | 'profile'>('overview');
  const [data, setData] = useState<{
    quotes: QuoteRecord[];
    bookings: BookingRecord[];
    events: ManagedEvent[];
    invoices: InvoiceRecord[];
    payments: PaymentRecord[];
    notifications: NotificationItem[];
    messages: ClientMessage[];
  }>({
    quotes: [],
    bookings: [],
    events: [],
    invoices: [],
    payments: [],
    notifications: [],
    messages: [],
  });
  const [loading, setLoading] = useState(true);
  const [msgForm, setMsgForm] = useState({ subject: '', body: '' });
  const [profileForm, setProfileForm] = useState({
    fullName: user.fullName,
    phone: user.phone,
    city: user.city,
    company: user.company,
  });
  const [feedback, setFeedback] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/client/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleQuoteDecision = async (quoteId: number, decision: 'Accepté' | 'Refusé') => {
    const res = await fetch(`/api/client/quotes/${quoteId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      setFeedback(`Devis marqué comme « ${decision} ».`);
      loadDashboard();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/client/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(msgForm),
    });
    if (res.ok) {
      setMsgForm({ subject: '', body: '' });
      loadDashboard();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileForm),
    });
    if (res.ok) {
      onUserUpdated({ ...user, ...profileForm });
      setFeedback('Profil mis à jour.');
    }
  };

  const markNotificationsRead = async () => {
    await fetch('/api/client/notifications/read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadDashboard();
  };

  const unreadNotifs = data.notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111111]/10 pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Espace Client STRONG EVENT PRO</p>
          <TextReveal as="h1" tone="light" text={`Bonjour, ${user.fullName}`} className="font-display text-3xl md:text-4xl font-semibold" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/devis')}
            className="px-4 py-2 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
          >
            Nouveau devis
          </button>
          <button
            type="button"
            onClick={() => navigate('/reserver')}
            className="px-4 py-2 text-xs font-medium border border-[#111111]/20 hover:border-[#C5A46D] cursor-pointer"
          >
            Réserver un événement
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#111111]/20 text-[#292929] hover:text-red-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#E8DFD0]/60 border border-[#C5A46D] text-xs font-medium flex justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="underline cursor-pointer">Fermer</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#111111]/10 pb-3">
        {[
          { id: 'overview', label: 'Vue générale' },
          { id: 'quotes', label: `Devis (${data.quotes.length})` },
          { id: 'bookings', label: `Réservations (${data.bookings.length})` },
          { id: 'tracking', label: `Suivi événements (${data.events.length})` },
          { id: 'invoices', label: `Factures & Reçus (${data.invoices.length})` },
          { id: 'messages', label: `Messagerie (${data.messages.length})` },
          { id: 'profile', label: 'Mon profil' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`px-4 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === item.id ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]' : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15 hover:border-[#C5A46D]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-sm text-[#292929]">Chargement de votre espace...</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Demandes de devis', val: data.quotes.length },
                    { label: 'Réservations', val: data.bookings.length },
                    { label: 'Projets en suivi', val: data.events.length },
                    { label: 'Notifications non lues', val: unreadNotifs },
                  ].map((k) => (
                    <div key={k.label} className="bg-white border border-[#111111]/12 p-4">
                      <div className="text-xs text-[#292929]/75">{k.label}</div>
                      <div className="font-mono-num text-2xl font-semibold mt-1">{k.val}</div>
                    </div>
                  ))}
                </div>

                {data.events.length > 0 && (
                  <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                    <h2 className="font-display text-2xl font-semibold">Avancement de votre événement</h2>
                    {data.events.map((ev) => (
                      <div key={ev.id} className="space-y-3 border-t border-[#111111]/10 pt-4">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm">{ev.title}</h3>
                            <p className="text-xs text-[#292929]">
                              {ev.eventDate} · {ev.venue} · Budget : <span className="font-mono-num">{formatMad(ev.budgetMad)}</span>
                            </p>
                          </div>
                          <span className="text-xs font-medium text-[#C5A46D]">{ev.status}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-7 gap-1.5 pt-2">
                          {EVENT_STAGES.map((st, idx) => {
                            const stageNum = idx + 1;
                            const done = stageNum <= ev.currentStage;
                            return (
                              <div
                                key={st}
                                className={`p-2 text-[11px] border ${
                                  done ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]' : 'bg-[#FAF9F6] text-[#292929]/70 border-[#111111]/10'
                                }`}
                              >
                                {st}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <aside className="lg:col-span-4 bg-white border border-[#111111]/12 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Bell className="w-4 h-4 text-[#C5A46D]" />
                    <span>Notifications ({unreadNotifs})</span>
                  </div>
                  {unreadNotifs > 0 && (
                    <button type="button" onClick={markNotificationsRead} className="text-xs underline cursor-pointer">
                      Tout marquer lu
                    </button>
                  )}
                </div>
                {data.notifications.length === 0 ? (
                  <p className="text-xs text-[#292929]">Aucune notification pour le moment.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.notifications.map((n) => (
                      <li key={n.id} className={`p-3 border text-xs space-y-1 ${n.isRead ? 'border-[#111111]/10 bg-[#FAF9F6]' : 'border-[#C5A46D] bg-[#E8DFD0]/35'}`}>
                        <div className="font-semibold">{n.title}</div>
                        <p className="text-[#292929]">{n.message}</p>
                        <div className="text-[11px] text-[#292929]/60 font-mono-num">{n.createdAt.slice(0, 10)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          )}

          {tab === 'quotes' && (
            <div className="space-y-4">
              {data.quotes.length === 0 ? (
                <p className="text-sm text-[#292929]">Aucune demande de devis enregistrée.</p>
              ) : (
                data.quotes.map((q) => (
                  <div key={q.id} className="bg-white border border-[#111111]/12 p-6 space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#111111]/10 pb-3">
                      <div>
                        <span className="font-mono-num text-xs text-[#C5A46D]">{q.reference}</span>
                        <h3 className="font-display text-2xl font-semibold">{q.eventType} — {q.eventDate}</h3>
                        <p className="text-xs text-[#292929]">{q.venue || q.city} · {q.guestCount} convives · Budget estimé : {q.estimatedBudgetMad}</p>
                      </div>
                      <div className="text-end">
                        <div className="text-xs font-semibold text-[#111111]">{q.status}</div>
                        {q.totalAmountMad > 0 && (
                          <div className="font-mono-num text-xl font-semibold text-[#C5A46D]">{formatMad(q.totalAmountMad)}</div>
                        )}
                      </div>
                    </div>

                    {q.items && q.items.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#111111]/10 text-[#292929]/70">
                              <th className="py-2 text-start">Prestation</th>
                              <th className="py-2 text-end">Qté</th>
                              <th className="py-2 text-end">P.U (MAD)</th>
                              <th className="py-2 text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#111111]/5">
                            {q.items.map((it, i) => (
                              <tr key={i}>
                                <td className="py-2 font-medium">{it.serviceName}</td>
                                <td className="py-2 text-end font-mono-num">{it.quantity}</td>
                                <td className="py-2 text-end font-mono-num">{it.unitPriceMad.toLocaleString('fr-FR')}</td>
                                <td className="py-2 text-end font-mono-num">{it.totalPriceMad.toLocaleString('fr-FR')} MAD</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {q.totalAmountMad > 0 && (
                        <button
                          type="button"
                          onClick={() => generateQuotePdf(q)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#111111]/20 hover:border-[#C5A46D] cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger PDF</span>
                        </button>
                      )}
                      {['Devis envoyé', 'En attente de validation'].includes(q.status) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleQuoteDecision(q.id, 'Accepté')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#111111] text-[#FAF9F6] hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accepter ce devis</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuoteDecision(q.id, 'Refusé')}
                            className="px-4 py-2 text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            Refuser
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'bookings' && (
            <div className="space-y-4">
              {data.bookings.length === 0 ? (
                <p className="text-sm text-[#292929]">Aucune réservation enregistrée.</p>
              ) : (
                data.bookings.map((b) => (
                  <div key={b.id} className="bg-white border border-[#111111]/12 p-6 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <span className="font-mono-num text-xs text-[#C5A46D]">{b.reference}</span>
                      <h3 className="font-display text-2xl font-semibold">{b.eventType}</h3>
                      <p className="text-xs text-[#292929]">
                        <span className="font-mono-num">{b.eventDate}</span> · {b.timeSlot} · {b.venue} ({b.guestCount} invités)
                      </p>
                      {b.selectedServices.length > 0 && (
                        <p className="text-xs text-[#292929]/75 pt-1">Prestations : {b.selectedServices.join(', ')}</p>
                      )}
                    </div>
                    <div className="text-start sm:text-end space-y-1 shrink-0">
                      <div className="text-xs font-semibold px-3 py-1 bg-[#E8DFD0] text-[#111111] inline-block">{b.status}</div>
                      <div className="font-mono-num text-sm font-semibold">{formatMad(b.estimatedTotalMad)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'tracking' && (
            <div className="space-y-6">
              {data.events.length === 0 ? (
                <p className="text-sm text-[#292929]">Aucun événement confirmé en suivi pour le moment.</p>
              ) : (
                data.events.map((ev) => (
                  <div key={ev.id} className="bg-white border border-[#111111]/12 p-6 space-y-5">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-semibold">{ev.title}</h3>
                        <p className="text-xs text-[#292929]">
                          {ev.eventDate} · {ev.venue} · Responsable : {ev.projectManager}
                        </p>
                      </div>
                      <div className="font-mono-num text-sm font-semibold text-[#C5A46D]">{formatMad(ev.budgetMad)}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                      {EVENT_STAGES.map((st, idx) => (
                        <div
                          key={st}
                          className={`p-2.5 text-xs border ${
                            idx + 1 <= ev.currentStage ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]' : 'bg-[#FAF9F6] text-[#292929]/60 border-[#111111]/10'
                          }`}
                        >
                          {st}
                        </div>
                      ))}
                    </div>
                    {ev.tasks && ev.tasks.length > 0 && (
                      <div className="pt-3 border-t border-[#111111]/10 space-y-2">
                        <p className="text-xs font-semibold">Checklist de préparation</p>
                        <ul className="space-y-1.5 text-xs">
                          {ev.tasks.map((tk) => (
                            <li key={tk.id} className="flex items-center justify-between">
                              <span className={tk.isDone ? 'line-through text-[#292929]/60' : 'text-[#111111]'}>
                                {tk.isDone ? '✓ ' : '○ '} {tk.title}
                              </span>
                              <span className="font-mono-num text-[#292929]/60">{tk.dueDate}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'invoices' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="w-4 h-4 text-[#C5A46D]" />
                  <span>Factures</span>
                </div>
                {data.invoices.length === 0 ? (
                  <p className="text-xs text-[#292929]">Aucune facture émise.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#111111]/10 text-[#292929]/75">
                          <th className="py-2 text-start">N° Facture</th>
                          <th className="py-2 text-end">Total</th>
                          <th className="py-2 text-end">Payé</th>
                          <th className="py-2 text-end">Reste dû</th>
                          <th className="py-2 text-end">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#111111]/5">
                        {data.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-2.5 font-mono-num font-semibold">{inv.invoiceNumber}</td>
                            <td className="py-2.5 text-end font-mono-num">{formatMad(inv.totalMad)}</td>
                            <td className="py-2.5 text-end font-mono-num">{formatMad(inv.paidMad)}</td>
                            <td className="py-2.5 text-end font-mono-num">{formatMad(inv.remainingMad)}</td>
                            <td className="py-2.5 text-end">{inv.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#111111]/12 p-6 space-y-4">
                <h3 className="text-sm font-semibold">Paiements & Reçus</h3>
                {data.payments.length === 0 ? (
                  <p className="text-xs text-[#292929]">Aucun paiement enregistré pour le moment.</p>
                ) : (
                  <div className="space-y-2">
                    {data.payments.map((pay) => (
                      <div key={pay.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111111]/10 pb-2 text-xs">
                        <div>
                          <span className="font-mono-num font-semibold">{pay.reference}</span> · {pay.paymentType} ({pay.method}) —{' '}
                          <span className="font-semibold">{pay.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono-num font-semibold">{formatMad(pay.amountMad)}</span>
                          {pay.status === 'Confirmé' && (
                            <button
                              type="button"
                              onClick={() => generateReceiptPdf(pay, data.invoices[0])}
                              className="px-3 py-1 border border-[#111111]/20 hover:border-[#C5A46D] cursor-pointer"
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
            </div>
          )}

          {tab === 'messages' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-white border border-[#111111]/12 p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="w-4 h-4 text-[#C5A46D]" />
                  <span>Échanges avec l’équipe STRONG EVENT PRO</span>
                </div>
                {data.messages.length === 0 ? (
                  <p className="text-xs text-[#292929]">Aucun message échangé.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3.5 border text-xs space-y-1 ${
                          m.senderRole === 'admin' ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]/40' : 'bg-[#FAF9F6] border-[#111111]/15'
                        }`}
                      >
                        <div className="flex justify-between opacity-75">
                          <span className="font-semibold">{m.senderName}</span>
                          <span className="font-mono-num">{m.createdAt.slice(0, 10)}</span>
                        </div>
                        <div className="font-medium">{m.subject}</div>
                        <p className="opacity-90 leading-relaxed">{m.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="lg:col-span-5 bg-white border border-[#111111]/12 p-6 space-y-4 self-start">
                <h3 className="font-display text-2xl font-semibold">Écrire à votre chef de projet</h3>
                <input
                  required
                  placeholder="Objet du message"
                  value={msgForm.subject}
                  onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <textarea
                  required
                  rows={4}
                  placeholder="Votre message..."
                  value={msgForm.body}
                  onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
                >
                  Envoyer le message
                </button>
              </form>
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="max-w-xl bg-white border border-[#111111]/12 p-8 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="w-4 h-4 text-[#C5A46D]" />
                <span>Informations personnelles</span>
              </div>
              <div>
                <label className="block text-xs text-[#292929] mb-1">Nom complet</label>
                <input
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#292929] mb-1">Téléphone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#292929] mb-1">Ville</label>
                <input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#292929] mb-1">Société (facultatif)</label>
                <input
                  value={profileForm.company}
                  onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] cursor-pointer"
              >
                Enregistrer les modifications
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};
