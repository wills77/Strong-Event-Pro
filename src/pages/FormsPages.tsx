import React, { useEffect, useState } from 'react';
import { Calendar, Check, Upload } from 'lucide-react';
import { TextReveal } from '../components/TextReveal';
import { formatMad } from '../lib/i18n';
import type { AuthUser, EventCategory, ServiceItem, ServicePackage, StoreSettings } from '../types';

/* ---------------- INTELLIGENT QUOTE REQUEST FORM ---------------- */
interface QuoteFormPageProps {
  categories: EventCategory[];
  services: ServiceItem[];
  settings: StoreSettings;
  user: AuthUser | null;
  preselectedEventType: string;
  preselectedServices: string[];
  navigate: (path: string) => void;
}

export const QuoteFormPage: React.FC<QuoteFormPageProps> = ({
  categories,
  services,
  settings,
  user,
  preselectedEventType,
  preselectedServices,
  navigate,
}) => {
  const [form, setForm] = useState({
    eventType: preselectedEventType || categories[0]?.name || 'Mariages',
    clientName: user?.fullName || '',
    clientEmail: user?.email || '',
    clientPhone: user?.phone || '',
    eventDate: '',
    startTime: '19:00',
    durationHours: 6,
    city: user?.city || 'Casablanca',
    venue: '',
    guestCount: 120,
    estimatedBudgetMad: settings.budgetRanges[1] || '30 000 – 80 000 MAD',
    selectedServices: preselectedServices,
    styleTheme: '',
    projectDescription: '',
    specificNeeds: '',
    attachmentUrls: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [submitState, setSubmitState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; ref?: string; msg?: string }>({
    status: 'idle',
  });

  const toggleService = (name: string) => {
    setForm((prev) => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(name)
        ? prev.selectedServices.filter((s) => s !== name)
        : [...prev.selectedServices, name],
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, attachmentUrls: [...prev.attachmentUrls, data.url] }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState({ status: 'loading' });
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitState({ status: 'error', msg: data.error || 'Erreur lors de la création.' });
        return;
      }
      setSubmitState({
        status: 'success',
        ref: data.reference,
        msg: 'Votre demande de devis a été enregistrée dans notre base de données et transmise à nos chefs de projet à Casablanca.',
      });
    } catch {
      setSubmitState({ status: 'error', msg: 'Erreur de connexion au serveur.' });
    }
  };

  if (submitState.status === 'success') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-[#FAF9F6] border border-[#C5A46D] p-10 space-y-5">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Demande enregistrée</p>
          <TextReveal as="h1" tone="light" text="Merci pour votre confiance." className="font-display text-4xl font-semibold" />
          <p className="text-sm text-[#292929]">
            Référence unique de suivi :{' '}
            <span className="font-mono-num font-semibold text-[#111111] bg-[#E8DFD0] px-2 py-0.5">{submitState.ref}</span>
          </p>
          <p className="text-sm text-[#292929] leading-relaxed">{submitState.msg}</p>
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(user ? '/espace-client' : '/connexion')}
              className="px-6 py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Suivre ma demande dans l’espace client
            </button>
            <button
              type="button"
              onClick={() => setSubmitState({ status: 'idle' })}
              className="px-6 py-3 border border-[#111111]/20 text-xs font-medium cursor-pointer"
            >
              Créer une autre demande
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-10">
      <div className="space-y-3 border-b border-[#111111]/10 pb-8">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Étude personnalisée en MAD</p>
        <TextReveal as="h1" tone="light" text="Demander un Devis Sur Mesure" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-sm md:text-base text-[#292929]">
          Renseignez les caractéristiques de votre événement. Une référence unique est générée immédiatement pour le suivi dans votre espace client.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-[#111111]/12 p-6 sm:p-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Type d’événement *</label>
            <select
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
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
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Adresse e-mail *</label>
            <input
              required
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Numéro de téléphone *</label>
            <input
              required
              type="tel"
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Date souhaitée *</label>
            <input
              required
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Heure de début</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Durée prévue (heures)</label>
            <input
              type="number"
              min={1}
              max={72}
              value={form.durationHours}
              onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Ville</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Lieu envisagé (ou « À trouver »)</label>
            <input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="Hôtel, villa, salle de conférence..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Nombre de participants</label>
            <input
              type="number"
              min={10}
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Budget estimatif (MAD)</label>
            <select
              value={form.estimatedBudgetMad}
              onChange={(e) => setForm({ ...form, estimatedBudgetMad: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            >
              {settings.budgetRanges.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Style ou thème souhaité</label>
            <input
              value={form.styleTheme}
              onChange={(e) => setForm({ ...form, styleTheme: e.target.value })}
              placeholder="Minimaliste ivoire & or, Corporate..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#111111]/10">
          <label className="block text-xs font-semibold text-[#111111]">Services souhaités</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {services.map((s) => {
              const checked = form.selectedServices.includes(s.name);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.name)}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs border text-start transition-colors cursor-pointer ${
                    checked ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]' : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15 hover:border-[#C5A46D]'
                  }`}
                >
                  <span className="truncate pe-2">{s.name}</span>
                  {checked && <Check className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[#111111]/10">
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Description du projet</label>
            <textarea
              rows={4}
              value={form.projectDescription}
              onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
              placeholder="Décrivez le déroulement envisagé, l'ambiance et vos priorités..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292929] mb-1.5">Besoins spécifiques & inspirations</label>
            <textarea
              rows={4}
              value={form.specificNeeds}
              onChange={(e) => setForm({ ...form, specificNeeds: e.target.value })}
              placeholder="Contraintes techniques, accès PMR, exigences alimentaires..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#111111]/10 space-y-2">
          <label className="block text-xs font-medium text-[#292929]">
            Fichiers ou images d’inspiration (JPG, PNG, WEBP, PDF — max 5 Mo)
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-[#111111]/25 hover:border-[#C5A46D] cursor-pointer">
              <Upload className="w-4 h-4 text-[#C5A46D]" />
              <span>{uploading ? 'Téléversement...' : 'Joindre un fichier'}</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            {form.attachmentUrls.length > 0 && (
              <span className="text-xs text-[#292929]">
                {form.attachmentUrls.length} fichier(s) joint(s)
              </span>
            )}
          </div>
        </div>

        {submitState.status === 'error' && <p className="text-xs text-red-700 font-medium">{submitState.msg}</p>}

        <button
          type="submit"
          disabled={submitState.status === 'loading'}
          className="px-8 py-3.5 bg-[#111111] text-[#FAF9F6] text-sm font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer disabled:opacity-50"
        >
          {submitState.status === 'loading' ? 'Enregistrement...' : 'Valider ma demande de devis'}
        </button>
      </form>
    </div>
  );
};

/* ---------------- EVENT BOOKING SYSTEM WITH AVAILABILITY CALENDAR ---------------- */
interface BookingPageProps {
  categories: EventCategory[];
  services: ServiceItem[];
  packages: ServicePackage[];
  user: AuthUser | null;
  preselectedEventType: string;
  navigate: (path: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  categories,
  services,
  packages,
  user,
  preselectedEventType,
  navigate,
}) => {
  const timeSlots = [
    'Matinée (08h00 – 13h00)',
    'Après-midi (14h00 – 19h00)',
    'Soirée (18h00 – 02h00)',
    'Journée complète (08h00 – 18h00)',
  ];

  const [occupied, setOccupied] = useState<{ eventDate: string; timeSlot: string; status: string }[]>([]);
  const [form, setForm] = useState({
    eventType: preselectedEventType || categories[0]?.name || 'Mariages',
    eventDate: '',
    timeSlot: timeSlots[2],
    venue: '',
    city: user?.city || 'Casablanca',
    guestCount: 100,
    selectedPackageId: packages[1]?.id || null,
    selectedServices: [] as string[],
    options: [] as string[],
    additionalInfo: '',
    clientName: user?.fullName || '',
    clientEmail: user?.email || '',
    clientPhone: user?.phone || '',
  });
  const [submitState, setSubmitState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; ref?: string; msg?: string }>({
    status: 'idle',
  });

  useEffect(() => {
    fetch('/api/availability')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.occupied)) setOccupied(d.occupied);
      })
      .catch(() => undefined);
  }, []);

  const selectedPkg = packages.find((p) => p.id === form.selectedPackageId) || null;
  const servicesEstimate = form.selectedServices.reduce((sum, name) => {
    const srv = services.find((s) => s.name === name);
    return sum + (srv?.indicativePriceMad || 0);
  }, 0);
  const estimatedTotalMad = (selectedPkg?.indicativePriceMad || 0) + servicesEstimate;

  const isSlotConfirmedConflict = (date: string, slot: string) =>
    occupied.some(
      (o) =>
        o.eventDate === date &&
        o.timeSlot === slot &&
        ['Confirmée', 'En préparation', 'En cours de réalisation'].includes(o.status)
    );

  const toggleItem = (field: 'selectedServices' | 'options', value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((x) => x !== value) : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSlotConfirmedConflict(form.eventDate, form.timeSlot)) {
      setSubmitState({
        status: 'error',
        msg: 'Ce créneau est déjà confirmé sur le calendrier. Veuillez sélectionner une autre date ou plage horaire.',
      });
      return;
    }
    setSubmitState({ status: 'loading' });
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estimatedTotalMad }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitState({ status: 'error', msg: data.error || 'Erreur lors de la réservation.' });
        return;
      }
      setSubmitState({
        status: 'success',
        ref: data.reference,
        msg: 'Votre demande de réservation est enregistrée au statut « En attente ». Elle sera confirmée uniquement après vérification complète des disponibilités et des ressources par notre équipe.',
      });
    } catch {
      setSubmitState({ status: 'error', msg: 'Erreur de connexion au serveur.' });
    }
  };

  if (submitState.status === 'success') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-[#FAF9F6] border border-[#C5A46D] p-10 space-y-5">
          <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Statut initial : En attente de confirmation</p>
          <TextReveal as="h1" tone="light" text="Demande de réservation enregistrée" className="font-display text-4xl font-semibold" />
          <p className="text-sm text-[#292929]">
            Référence : <span className="font-mono-num font-semibold bg-[#E8DFD0] px-2 py-0.5">{submitState.ref}</span>
          </p>
          <p className="text-sm text-[#292929] leading-relaxed">{submitState.msg}</p>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(user ? '/espace-client' : '/connexion')}
              className="px-6 py-3 bg-[#111111] text-[#FAF9F6] text-xs font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Suivre ma réservation
            </button>
            <button
              type="button"
              onClick={() => setSubmitState({ status: 'idle' })}
              className="px-6 py-3 border border-[#111111]/20 text-xs font-medium cursor-pointer"
            >
              Nouvelle réservation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
      <div className="space-y-3 border-b border-[#111111]/10 pb-8 max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-[#C5A46D]">Calendrier & Réservation</p>
        <TextReveal as="h1" tone="light" text="Réserver un Événement" className="font-display text-4xl md:text-5xl font-semibold" />
        <p className="text-sm md:text-base text-[#292929]">
          Important : une demande de réservation reste en statut « En attente » jusqu’à vérification des disponibilités, conditions et ressources par l’équipe STRONG EVENT PRO.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-white border border-[#111111]/12 p-6 sm:p-8 space-y-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1.5">Type d’événement *</label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1.5">Date souhaitée *</label>
              <input
                required
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1.5">Créneau horaire *</label>
              <select
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              >
                {timeSlots.map((slot) => {
                  const busy = form.eventDate && isSlotConfirmedConflict(form.eventDate, slot);
                  return (
                    <option key={slot} value={slot} disabled={Boolean(busy)}>
                      {slot} {busy ? '(Indisponible)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1.5">Nombre d’invités *</label>
              <input
                required
                type="number"
                min={10}
                value={form.guestCount}
                onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1.5">Lieu de l’événement *</label>
              <input
                required
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="Quartier, salle, domaine à Casablanca..."
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292929] mb-1.5">Ville</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#111111]/10 space-y-3">
            <label className="block text-xs font-semibold text-[#111111]">Formule d’accompagnement</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((pkg) => {
                const active = form.selectedPackageId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setForm({ ...form, selectedPackageId: active ? null : pkg.id })}
                    className={`p-4 border text-start transition-colors cursor-pointer ${
                      active ? 'bg-[#111111] text-[#FAF9F6] border-[#C5A46D]' : 'bg-[#FAF9F6] text-[#111111] border-[#111111]/15 hover:border-[#C5A46D]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-lg font-semibold text-[#C5A46D]">{pkg.name}</span>
                      <span className="font-mono-num text-xs">{formatMad(pkg.indicativePriceMad)}</span>
                    </div>
                    <p className="text-xs opacity-80 mt-1">{pkg.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#111111]/10 space-y-3">
            <label className="block text-xs font-semibold text-[#111111]">Prestations complémentaires</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.map((srv) => {
                const checked = form.selectedServices.includes(srv.name);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleItem('selectedServices', srv.name)}
                    className={`px-3.5 py-2 text-xs border flex items-center justify-between text-start cursor-pointer ${
                      checked ? 'bg-[#111111] text-[#FAF9F6] border-[#111111]' : 'bg-[#FAF9F6] text-[#292929] border-[#111111]/15'
                    }`}
                  >
                    <span className="truncate pe-2">{srv.name}</span>
                    <span className="font-mono-num shrink-0 text-[11px] opacity-80">
                      {srv.indicativePriceMad ? formatMad(srv.indicativePriceMad) : 'Devis'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#111111]/10 space-y-3">
            <label className="block text-xs font-semibold text-[#111111]">Options additionnelles</label>
            <div className="flex flex-wrap gap-2">
              {['Hôtesses d’accueil', 'Photobooth miroir doré', 'Streaming privé', 'Voiturier & sécurité', 'Feux froids'].map((opt) => {
                const active = form.options.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleItem('options', opt)}
                    className={`px-3 py-1.5 text-xs border cursor-pointer ${
                      active ? 'bg-[#C5A46D] text-[#111111] border-[#C5A46D] font-semibold' : 'bg-[#FAF9F6] border-[#111111]/15 text-[#292929]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#111111]/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              required
              placeholder="Nom & prénom *"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            <input
              required
              type="email"
              placeholder="E-mail *"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
              className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            <input
              required
              type="tel"
              placeholder="Téléphone *"
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
              className="px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
            <textarea
              rows={3}
              placeholder="Informations complémentaires sur l’organisation..."
              value={form.additionalInfo}
              onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
              className="sm:col-span-3 px-3.5 py-2.5 text-sm border border-[#111111]/20 bg-[#FAF9F6]"
            />
          </div>

          {submitState.status === 'error' && <p className="text-xs text-red-700 font-medium">{submitState.msg}</p>}

          <button
            type="submit"
            disabled={submitState.status === 'loading'}
            className="w-full py-3.5 bg-[#111111] text-[#FAF9F6] text-sm font-semibold hover:bg-[#C5A46D] hover:text-[#111111] transition-colors cursor-pointer"
          >
            {submitState.status === 'loading' ? 'Transmission...' : 'Soumettre la demande de réservation'}
          </button>
        </form>

        {/* Right Summary & Availability Calendar */}
        <aside className="lg:col-span-4 space-y-6 sticky top-24">
          <div className="bg-[#111111] text-[#FAF9F6] p-6 border border-[#C5A46D]/35 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#C5A46D]">Récapitulatif</h2>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[#E8DFD0]/70">Événement</dt>
                <dd className="font-medium text-end">{form.eventType}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#E8DFD0]/70">Date</dt>
                <dd className="font-mono-num">{form.eventDate || 'À sélectionner'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#E8DFD0]/70">Créneau</dt>
                <dd className="text-end">{form.timeSlot}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#E8DFD0]/70">Invités</dt>
                <dd className="font-mono-num">{form.guestCount} personnes</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#E8DFD0]/70">Formule</dt>
                <dd>{selectedPkg?.name || 'Aucune'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#E8DFD0]/70">Prestations</dt>
                <dd className="font-mono-num">{form.selectedServices.length}</dd>
              </div>
            </dl>
            <div className="pt-4 border-t border-[#FAF9F6]/15 flex items-baseline justify-between">
              <span className="text-xs text-[#E8DFD0]/70">Estimation indicative</span>
              <span className="font-mono-num text-xl font-semibold text-[#C5A46D]">
                {estimatedTotalMad > 0 ? formatMad(estimatedTotalMad) : 'Sur devis'}
              </span>
            </div>
            <p className="text-[11px] text-[#E8DFD0]/65 leading-relaxed">
              Aucun paiement immédiat n’est prélevé. Notre équipe vérifie d’abord la disponibilité réelle des ressources.
            </p>
          </div>

          <div className="bg-[#FAF9F6] border border-[#111111]/15 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
              <Calendar className="w-4 h-4 text-[#C5A46D]" />
              <span>Créneaux déjà occupés</span>
            </div>
            {occupied.length === 0 ? (
              <p className="text-xs text-[#292929]">Toutes les dates prochaines sont actuellement ouvertes.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {occupied.slice(0, 6).map((o, idx) => (
                  <li key={idx} className="flex items-center justify-between border-b border-[#111111]/10 pb-1.5">
                    <span className="font-mono-num text-[#111111]">{o.eventDate}</span>
                    <span className="text-[#292929]/75 truncate max-w-[160px]">{o.timeSlot} · {o.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
