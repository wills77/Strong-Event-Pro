import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  type AuthenticatedRequest,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  signToken,
  verifyPassword,
} from './src/server/auth.ts';
import { createNotification, db, initDatabase, logAdminAction } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDatabase();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '4mb' }));

// Safe upload directory with strict path confinement & MIME filter
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé (JPG, PNG, WEBP, PDF uniquement).'));
    }
  },
});

app.use('/uploads', express.static(UPLOAD_DIR));

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateRef(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomInt(1000, 9999);
  return `${prefix}-${year}-${rand}`;
}

function getSafeSettings() {
  const row = db.prepare(`SELECT * FROM store_settings WHERE id = 1`).get() as Record<string, unknown>;
  return {
    agencyName: String(row.agencyName || 'STRONG EVENT PRO'),
    slogan: String(row.slogan || 'Vos événements, notre expertise.'),
    city: String(row.city || 'Casablanca, Maroc'),
    address: String(row.address || ''),
    phone: String(row.phone || ''),
    whatsappNumber: String(row.whatsappNumber || ''),
    email: String(row.email || ''),
    openingHours: String(row.openingHours || ''),
    googleMapsEmbedUrl: String(row.googleMapsEmbedUrl || ''),
    googleMapsLink: String(row.googleMapsLink || ''),
    heroTitle: String(row.heroTitle || ''),
    heroSubtitle: String(row.heroSubtitle || ''),
    heroImageUrl: String(row.heroImageUrl || ''),
    aboutText: String(row.aboutText || ''),
    socialLinks: parseJson(row.socialLinks, { instagram: '', linkedin: '', facebook: '', tiktok: '' }),
    budgetRanges: parseJson(row.budgetRanges, [] as string[]),
    emailNotificationsEnabled: Boolean(row.emailNotificationsEnabled),
    whatsappNotificationsEnabled: Boolean(row.whatsappNotificationsEnabled),
    legalMentions: String(row.legalMentions || ''),
    privacyPolicy: String(row.privacyPolicy || ''),
    termsOfSale: String(row.termsOfSale || ''),
  };
}

// Middleware to ensure admin changed initial default password before accessing admin data
function enforceAdminPasswordUpdated(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const user = db.prepare(`SELECT mustChangePassword FROM users WHERE id = ?`).get(req.user.userId) as
    | { mustChangePassword: number }
    | undefined;
  if (!user || user.mustChangePassword === 1) {
    res.status(428).json({
      error: 'Changement de mot de passe requis lors de la première connexion administrateur.',
      mustChangePassword: true,
    });
    return;
  }
  next();
}

// ---------------- HEALTH & PUBLIC BOOTSTRAP ----------------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'STRONG EVENT PRO' });
});

app.get('/api/bootstrap', (_req, res) => {
  const settings = getSafeSettings();
  const categories = (db.prepare(`SELECT * FROM event_categories ORDER BY id ASC`).all() as Record<string, unknown>[]).map((c) => ({
    ...c,
    includedServices: parseJson(c.includedServices, [] as string[]),
  }));
  const services = (db.prepare(`SELECT * FROM services WHERE isActive = 1 ORDER BY id ASC`).all() as Record<string, unknown>[]).map((s) => ({
    ...s,
    includedItems: parseJson(s.includedItems, [] as string[]),
    options: parseJson(s.options, [] as string[]),
    isAvailable: Boolean(s.isAvailable),
    isActive: Boolean(s.isActive),
  }));
  const packages = (db.prepare(`SELECT * FROM service_packages WHERE isActive = 1 ORDER BY sortOrder ASC`).all() as Record<string, unknown>[]).map((p) => ({
    ...p,
    includedItems: parseJson(p.includedItems, [] as string[]),
    extraOptions: parseJson(p.extraOptions, [] as string[]),
    isActive: Boolean(p.isActive),
  }));
  const providers = (db.prepare(`SELECT id, businessName, category, description, city, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt FROM providers WHERE validationStatus = 'approved' ORDER BY id ASC`).all() as Record<string, unknown>[]).map((pr) => ({
    ...pr,
    servicesOffered: parseJson(pr.servicesOffered, [] as string[]),
    galleryUrls: parseJson(pr.galleryUrls, [] as string[]),
    isDemo: Boolean(pr.isDemo),
  }));
  const portfolio = (db.prepare(`SELECT * FROM portfolio ORDER BY id DESC`).all() as Record<string, unknown>[]).map((p) => ({
    ...p,
    galleryUrls: parseJson(p.galleryUrls, [] as string[]),
    isDemo: Boolean(p.isDemo),
  }));
  const reviews = (db.prepare(`SELECT * FROM reviews WHERE isPublished = 1 ORDER BY id DESC`).all() as Record<string, unknown>[]).map((r) => ({
    ...r,
    isDemo: Boolean(r.isDemo),
    isPublished: Boolean(r.isPublished),
  }));
  const articles = (db.prepare(`SELECT * FROM news_articles WHERE isPublished = 1 ORDER BY id DESC`).all() as Record<string, unknown>[]).map((a) => ({
    ...a,
    isPublished: Boolean(a.isPublished),
  }));
  const faqs = (db.prepare(`SELECT * FROM faqs WHERE isPublished = 1 ORDER BY sortOrder ASC`).all() as Record<string, unknown>[]).map((f) => ({
    ...f,
    isPublished: Boolean(f.isPublished),
  }));

  res.json({
    settings,
    categories,
    services,
    packages,
    providers,
    portfolio,
    reviews,
    articles,
    faqs,
  });
});

app.get('/api/availability', (_req, res) => {
  const occupied = db
    .prepare(`SELECT eventDate, timeSlot, status FROM bookings WHERE status NOT IN ('Annulée')`)
    .all() as { eventDate: string; timeSlot: string; status: string }[];
  res.json({ occupied });
});

// ---------------- AUTHENTICATION ----------------

app.post('/api/auth/register', (req, res) => {
  const { fullName, email, password, phone = '', city = 'Casablanca', company = '', role = 'client' } = req.body ?? {};
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Le nom complet est requis.' });
    return;
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    return;
  }
  const safeRole = role === 'provider' ? 'provider' : 'client';
  const cleanEmail = email.trim().toLowerCase();
  const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(cleanEmail);
  if (exists) {
    res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    return;
  }
  const now = new Date().toISOString();
  const info = db
    .prepare(`
      INSERT INTO users (username, email, fullName, phone, city, company, passwordHash, role, mustChangePassword, createdAt, updatedAt)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `)
    .run(cleanEmail, fullName.trim(), String(phone).trim(), String(city).trim() || 'Casablanca', String(company).trim(), hashPassword(password), safeRole, now, now);

  const userId = Number(info.lastInsertRowid);
  if (safeRole === 'client') {
    db.prepare(`
      INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, '', ?)
    `).run(userId, fullName.trim(), cleanEmail, String(phone).trim(), String(company).trim(), String(city).trim() || 'Casablanca', now);
  }

  const token = signToken({ userId, role: safeRole, email: cleanEmail, fullName: fullName.trim() });
  res.status(201).json({
    token,
    user: {
      id: userId,
      username: null,
      email: cleanEmail,
      fullName: fullName.trim(),
      phone: String(phone).trim(),
      city: String(city).trim() || 'Casablanca',
      company: String(company).trim(),
      role: safeRole,
      mustChangePassword: false,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body ?? {};
  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
    res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    return;
  }
  const ident = identifier.trim();
  const user = db
    .prepare(`SELECT * FROM users WHERE lower(email) = lower(?) OR username = ?`)
    .get(ident, ident) as Record<string, unknown> | undefined;

  if (!user || !verifyPassword(password, String(user.passwordHash))) {
    res.status(401).json({ error: 'Identifiants incorrects.' });
    return;
  }

  const userObj = {
    id: Number(user.id),
    username: user.username ? String(user.username) : null,
    email: String(user.email),
    fullName: String(user.fullName),
    phone: String(user.phone || ''),
    city: String(user.city || 'Casablanca'),
    company: String(user.company || ''),
    role: user.role as 'admin' | 'client' | 'provider',
    mustChangePassword: Boolean(user.mustChangePassword),
  };

  const token = signToken({
    userId: userObj.id,
    role: userObj.role,
    email: userObj.email,
    fullName: userObj.fullName,
  });

  if (userObj.role === 'admin') {
    logAdminAction(userObj.id, userObj.fullName, 'Connexion administrateur', 'auth', userObj.id);
  }

  res.json({ token, user: userObj });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = db.prepare(`SELECT id, username, email, fullName, phone, city, company, role, mustChangePassword FROM users WHERE id = ?`).get(req.user!.userId) as
    | Record<string, unknown>
    | undefined;
  if (!user) {
    res.status(404).json({ error: 'Compte introuvable.' });
    return;
  }
  res.json({
    user: {
      ...user,
      mustChangePassword: Boolean(user.mustChangePassword),
    },
  });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }
  if (newPassword === '123456789') {
    res.status(400).json({ error: 'Veuillez choisir un mot de passe différent du mot de passe initial.' });
    return;
  }
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.userId) as Record<string, unknown> | undefined;
  if (!user || !verifyPassword(currentPassword, String(user.passwordHash))) {
    res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    return;
  }
  db.prepare(`UPDATE users SET passwordHash = ?, mustChangePassword = 0, updatedAt = ? WHERE id = ?`).run(
    hashPassword(newPassword),
    new Date().toISOString(),
    req.user!.userId
  );
  if (user.role === 'admin') {
    logAdminAction(req.user!.userId, String(user.fullName), 'Mot de passe administrateur mis à jour', 'auth', req.user!.userId);
  }
  res.json({ success: true, mustChangePassword: false });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, resetToken, newPassword } = req.body ?? {};
  if (resetToken && newPassword) {
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    const user = db
      .prepare(`SELECT id, resetTokenExp FROM users WHERE resetToken = ?`)
      .get(String(resetToken)) as { id: number; resetTokenExp: number } | undefined;
    if (!user || user.resetTokenExp < Math.floor(Date.now() / 1000)) {
      res.status(400).json({ error: 'Jeton de réinitialisation invalide ou expiré.' });
      return;
    }
    db.prepare(`UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExp = NULL, updatedAt = ? WHERE id = ?`).run(
      hashPassword(newPassword),
      new Date().toISOString(),
      user.id
    );
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
    return;
  }

  if (typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ error: 'Adresse e-mail requise.' });
    return;
  }
  const user = db.prepare(`SELECT id, role FROM users WHERE lower(email) = lower(?)`).get(email.trim()) as
    | { id: number; role: string }
    | undefined;
  if (!user || user.role === 'admin') {
    res.json({
      success: true,
      emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      message: 'Si un compte client correspond à cette adresse, une demande de réinitialisation a été enregistrée.',
    });
    return;
  }
  const token = crypto.randomBytes(16).toString('hex');
  const exp = Math.floor(Date.now() / 1000) + 900;
  db.prepare(`UPDATE users SET resetToken = ?, resetTokenExp = ? WHERE id = ?`).run(token, exp, user.id);
  const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  res.json({
    success: true,
    emailConfigured,
    message: emailConfigured
      ? 'Un lien de réinitialisation vient d’être envoyé par e-mail.'
      : 'Service e-mail SMTP non configuré : utilisez le code de réinitialisation temporaire ci-dessous pour finaliser en local.',
    localResetCode: emailConfigured ? undefined : token,
  });
});

app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fullName, phone, city, company } = req.body ?? {};
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Nom complet requis.' });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET fullName = ?, phone = ?, city = ?, company = ?, updatedAt = ? WHERE id = ?`).run(
    fullName.trim(),
    String(phone || '').trim(),
    String(city || 'Casablanca').trim(),
    String(company || '').trim(),
    now,
    req.user!.userId
  );
  db.prepare(`UPDATE customers SET fullName = ?, phone = ?, city = ?, company = ? WHERE userId = ?`).run(
    fullName.trim(),
    String(phone || '').trim(),
    String(city || 'Casablanca').trim(),
    String(company || '').trim(),
    req.user!.userId
  );
  res.json({ success: true });
});

// ---------------- FILE UPLOAD ----------------

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Aucun fichier valide reçu.' });
    return;
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
});

// ---------------- PUBLIC SUBMISSIONS (QUOTES, BOOKINGS, CONTACT, NEWSLETTER, PROVIDER APPLY) ----------------

app.post('/api/quotes', optionalAuth, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.eventType || !b.clientName || !b.clientEmail || !b.clientPhone || !b.eventDate) {
    res.status(400).json({ error: 'Veuillez renseigner tous les champs obligatoires (type, nom, e-mail, téléphone, date).' });
    return;
  }
  const now = new Date().toISOString();
  const reference = generateRef('SEP-DEV');
  const cleanEmail = String(b.clientEmail).trim().toLowerCase();

  let customer = db.prepare(`SELECT id, userId FROM customers WHERE lower(email) = ?`).get(cleanEmail) as
    | { id: number; userId: number | null }
    | undefined;

  if (!customer) {
    const custRes = db
      .prepare(`INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt) VALUES (?, ?, ?, ?, '', ?, '', ?)`)
      .run(req.user?.userId ?? null, String(b.clientName).trim(), cleanEmail, String(b.clientPhone).trim(), String(b.city || 'Casablanca').trim(), now);
    customer = { id: Number(custRes.lastInsertRowid), userId: req.user?.userId ?? null };
  }

  const info = db
    .prepare(`
      INSERT INTO quotes (
        reference, customerId, userId, eventType, clientName, clientEmail, clientPhone,
        eventDate, startTime, durationHours, city, venue, guestCount, estimatedBudgetMad,
        selectedServices, styleTheme, projectDescription, specificNeeds, attachmentUrls,
        status, extraFeesMad, discountMad, totalAmountMad, validityDays, adminNotes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Nouvelle demande', 0, 0, 0, 15, '', ?, ?)
    `)
    .run(
      reference,
      customer.id,
      req.user?.userId ?? customer.userId ?? null,
      String(b.eventType).trim(),
      String(b.clientName).trim(),
      cleanEmail,
      String(b.clientPhone).trim(),
      String(b.eventDate).trim(),
      String(b.startTime || '19:00').trim(),
      Number(b.durationHours) || 6,
      String(b.city || 'Casablanca').trim(),
      String(b.venue || '').trim(),
      Number(b.guestCount) || 50,
      String(b.estimatedBudgetMad || '').trim(),
      JSON.stringify(Array.isArray(b.selectedServices) ? b.selectedServices : []),
      String(b.styleTheme || '').trim(),
      String(b.projectDescription || '').trim(),
      String(b.specificNeeds || '').trim(),
      JSON.stringify(Array.isArray(b.attachmentUrls) ? b.attachmentUrls : []),
      now,
      now
    );

  if (req.user?.userId || customer.userId) {
    createNotification(
      req.user?.userId ?? customer.userId,
      'Demande de devis enregistrée',
      `Votre demande ${reference} pour le ${String(b.eventDate)} a bien été transmise à notre équipe à Casablanca.`
    );
  }

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    reference,
    status: 'Nouvelle demande',
  });
});

app.post('/api/bookings', optionalAuth, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.eventType || !b.eventDate || !b.timeSlot || !b.venue || !b.clientName || !b.clientEmail || !b.clientPhone) {
    res.status(400).json({ error: 'Tous les champs obligatoires de réservation doivent être complétés.' });
    return;
  }

  // Availability conflict check against confirmed/active bookings
  const conflict = db
    .prepare(`
      SELECT id, reference FROM bookings
      WHERE eventDate = ? AND timeSlot = ? AND status IN ('Confirmée', 'En préparation', 'En cours de réalisation')
    `)
    .get(String(b.eventDate).trim(), String(b.timeSlot).trim()) as { id: number; reference: string } | undefined;

  if (conflict) {
    res.status(409).json({
      error: `Le créneau "${b.timeSlot}" du ${b.eventDate} est déjà réservé et confirmé (${conflict.reference}). Veuillez choisir une autre date ou créneau.`,
    });
    return;
  }

  const now = new Date().toISOString();
  const reference = generateRef('SEP-RES');
  const cleanEmail = String(b.clientEmail).trim().toLowerCase();

  let customer = db.prepare(`SELECT id, userId FROM customers WHERE lower(email) = ?`).get(cleanEmail) as
    | { id: number; userId: number | null }
    | undefined;

  if (!customer) {
    const custRes = db
      .prepare(`INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt) VALUES (?, ?, ?, ?, '', ?, '', ?)`)
      .run(req.user?.userId ?? null, String(b.clientName).trim(), cleanEmail, String(b.clientPhone).trim(), String(b.city || 'Casablanca').trim(), now);
    customer = { id: Number(custRes.lastInsertRowid), userId: req.user?.userId ?? null };
  }

  // IMPORTANT: Status always starts as 'En attente' until verified by STRONG EVENT PRO team
  const info = db
    .prepare(`
      INSERT INTO bookings (
        reference, customerId, userId, clientName, clientEmail, clientPhone,
        eventType, eventDate, timeSlot, venue, city, guestCount,
        selectedServices, selectedPackageId, options, additionalInfo,
        status, assignedManager, internalComments, estimatedTotalMad, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'En attente', '', '', ?, ?, ?)
    `)
    .run(
      reference,
      customer.id,
      req.user?.userId ?? customer.userId ?? null,
      String(b.clientName).trim(),
      cleanEmail,
      String(b.clientPhone).trim(),
      String(b.eventType).trim(),
      String(b.eventDate).trim(),
      String(b.timeSlot).trim(),
      String(b.venue).trim(),
      String(b.city || 'Casablanca').trim(),
      Number(b.guestCount) || 50,
      JSON.stringify(Array.isArray(b.selectedServices) ? b.selectedServices : []),
      b.selectedPackageId ? Number(b.selectedPackageId) : null,
      JSON.stringify(Array.isArray(b.options) ? b.options : []),
      String(b.additionalInfo || '').trim(),
      Number(b.estimatedTotalMad) || 0,
      now,
      now
    );

  if (req.user?.userId || customer.userId) {
    createNotification(
      req.user?.userId ?? customer.userId,
      'Demande de réservation reçue',
      `Votre demande ${reference} est enregistrée en statut « En attente » pour vérification des disponibilités.`
    );
  }

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    reference,
    status: 'En attente',
  });
});

app.post('/api/newsletter', (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  db.prepare(`INSERT OR IGNORE INTO newsletter_subscribers (email, createdAt) VALUES (?, ?)`).run(
    cleanEmail,
    new Date().toISOString()
  );
  res.status(201).json({ success: true, message: 'Inscription à la lettre d’information confirmée.' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone = '', subject, message } = req.body ?? {};
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'Nom, e-mail, objet et message sont requis.' });
    return;
  }
  db.prepare(`INSERT INTO contact_messages (name, email, phone, subject, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`).run(
    String(name).trim(),
    String(email).trim(),
    String(phone).trim(),
    String(subject).trim(),
    String(message).trim(),
    new Date().toISOString()
  );
  res.status(201).json({ success: true });
});

app.post('/api/providers/apply', optionalAuth, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.businessName || !b.category || !b.description || !b.email) {
    res.status(400).json({ error: 'Nom commercial, catégorie, description et e-mail sont requis.' });
    return;
  }
  const info = db
    .prepare(`
      INSERT INTO providers (userId, businessName, category, description, city, phone, email, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, '', 'pending', 0, ?)
    `)
    .run(
      req.user?.userId ?? null,
      String(b.businessName).trim(),
      String(b.category).trim(),
      String(b.description).trim(),
      String(b.city || 'Casablanca').trim(),
      String(b.phone || '').trim(),
      String(b.email).trim(),
      b.indicativePriceMad ? Number(b.indicativePriceMad) : null,
      JSON.stringify(Array.isArray(b.servicesOffered) ? b.servicesOffered : []),
      String(b.availabilityNotes || '').trim(),
      new Date().toISOString()
    );
  res.status(201).json({
    id: Number(info.lastInsertRowid),
    validationStatus: 'pending',
    message: 'Votre profil prestataire a été soumis et sera publié après validation par STRONG EVENT PRO.',
  });
});

// ---------------- CLIENT PORTAL ----------------

app.get('/api/client/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const email = req.user!.email.toLowerCase();

  const customer = db.prepare(`SELECT * FROM customers WHERE userId = ? OR lower(email) = ?`).get(userId, email) as
    | { id: number }
    | undefined;
  const customerId = customer?.id ?? -1;

  const quotes = (
    db
      .prepare(`SELECT * FROM quotes WHERE userId = ? OR customerId = ? OR lower(clientEmail) = ? ORDER BY id DESC`)
      .all(userId, customerId, email) as Record<string, unknown>[]
  ).map((q) => ({
    ...q,
    selectedServices: parseJson(q.selectedServices, [] as string[]),
    attachmentUrls: parseJson(q.attachmentUrls, [] as string[]),
    items: db.prepare(`SELECT * FROM quote_items WHERE quoteId = ?`).all(q.id),
  }));

  const bookings = (
    db
      .prepare(`SELECT * FROM bookings WHERE userId = ? OR customerId = ? OR lower(clientEmail) = ? ORDER BY id DESC`)
      .all(userId, customerId, email) as Record<string, unknown>[]
  ).map((bk) => ({
    ...bk,
    selectedServices: parseJson(bk.selectedServices, [] as string[]),
    options: parseJson(bk.options, [] as string[]),
  }));

  const events = (
    db.prepare(`SELECT * FROM events WHERE customerId = ? ORDER BY id DESC`).all(customerId) as Record<string, unknown>[]
  ).map((ev) => ({
    ...ev,
    documents: parseJson(ev.documents, [] as { name: string; url: string }[]),
    tasks: (db.prepare(`SELECT * FROM tasks WHERE eventId = ? ORDER BY stage ASC, id ASC`).all(ev.id) as Record<string, unknown>[]).map((t) => ({
      ...t,
      isDone: Boolean(t.isDone),
    })),
  }));

  const invoices = db.prepare(`SELECT * FROM invoices WHERE customerId = ? ORDER BY id DESC`).all(customerId);
  const payments = db.prepare(`SELECT * FROM payments WHERE customerId = ? ORDER BY id DESC`).all(customerId);
  const notifications = (
    db.prepare(`SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC LIMIT 30`).all(userId) as Record<string, unknown>[]
  ).map((n) => ({ ...n, isRead: Boolean(n.isRead) }));
  const messages = (
    db.prepare(`SELECT * FROM messages WHERE userId = ? ORDER BY id ASC`).all(userId) as Record<string, unknown>[]
  ).map((m) => ({ ...m, isRead: Boolean(m.isRead) }));

  res.json({ quotes, bookings, events, invoices, payments, notifications, messages });
});

app.post('/api/client/quotes/:id/respond', requireAuth, (req: AuthenticatedRequest, res) => {
  const quoteId = Number(req.params.id);
  const { decision } = req.body ?? {};
  if (decision !== 'Accepté' && decision !== 'Refusé') {
    res.status(400).json({ error: 'Décision invalide.' });
    return;
  }
  const email = req.user!.email.toLowerCase();
  const quote = db
    .prepare(`SELECT * FROM quotes WHERE id = ? AND (userId = ? OR lower(clientEmail) = ?)`)
    .get(quoteId, req.user!.userId, email) as Record<string, unknown> | undefined;
  if (!quote) {
    res.status(404).json({ error: 'Devis introuvable ou accès refusé.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE quotes SET status = ?, updatedAt = ? WHERE id = ?`).run(decision, now, quoteId);

  if (decision === 'Accepté') {
    const existingInv = db.prepare(`SELECT id FROM invoices WHERE quoteId = ?`).get(quoteId);
    if (!existingInv && Number(quote.totalAmountMad) > 0) {
      db.prepare(`
        INSERT INTO invoices (invoiceNumber, quoteId, eventId, customerId, totalMad, paidMad, remainingMad, status, issuedAt)
        VALUES (?, ?, NULL, ?, ?, 0, ?, 'Émise', ?)
      `).run(
        generateRef('FAC'),
        quoteId,
        quote.customerId ? Number(quote.customerId) : null,
        Number(quote.totalAmountMad),
        Number(quote.totalAmountMad),
        now
      );
    }
    createNotification(
      req.user!.userId,
      'Devis accepté',
      `Vous avez accepté le devis ${String(quote.reference)}. Notre équipe va finaliser la planification.`
    );
  } else {
    createNotification(
      req.user!.userId,
      'Devis refusé',
      `Votre retour concernant le devis ${String(quote.reference)} a bien été enregistré.`
    );
  }

  res.json({ success: true, status: decision });
});

app.post('/api/client/messages', requireAuth, (req: AuthenticatedRequest, res) => {
  const { subject, body } = req.body ?? {};
  if (!subject || !body) {
    res.status(400).json({ error: 'Objet et message requis.' });
    return;
  }
  const info = db
    .prepare(`INSERT INTO messages (userId, senderRole, senderName, subject, body, isRead, createdAt) VALUES (?, 'client', ?, ?, ?, 0, ?)`)
    .run(req.user!.userId, req.user!.fullName, String(subject).trim(), String(body).trim(), new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.post('/api/client/notifications/read', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`UPDATE notifications SET isRead = 1 WHERE userId = ?`).run(req.user!.userId);
  res.json({ success: true });
});

// ---------------- ADMIN DASHBOARD & CRUD ----------------

app.get('/api/admin/overview', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const totalQuotes = (db.prepare(`SELECT COUNT(*) as c FROM quotes`).get() as { c: number }).c;
  const pendingQuotes = (
    db.prepare(`SELECT COUNT(*) as c FROM quotes WHERE status IN ('Nouvelle demande', 'En cours d''étude', 'En attente de validation')`).get() as { c: number }
  ).c;
  const totalBookings = (db.prepare(`SELECT COUNT(*) as c FROM bookings`).get() as { c: number }).c;
  const pendingBookings = (
    db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE status IN ('En attente', 'En cours de confirmation')`).get() as { c: number }
  ).c;
  const confirmedBookings = (
    db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE status IN ('Confirmée', 'En préparation', 'En cours de réalisation')`).get() as { c: number }
  ).c;
  const upcomingEvents = (
    db.prepare(`SELECT COUNT(*) as c FROM events WHERE status != 'Terminé' AND status != 'Clôturé'`).get() as { c: number }
  ).c;
  const completedEvents = (
    db.prepare(`SELECT COUNT(*) as c FROM events WHERE status IN ('Terminé', 'Clôturé')`).get() as { c: number }
  ).c;
  const totalCustomers = (db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as { c: number }).c;
  const totalProviders = (db.prepare(`SELECT COUNT(*) as c FROM providers`).get() as { c: number }).c;
  const approvedProviders = (
    db.prepare(`SELECT COUNT(*) as c FROM providers WHERE validationStatus = 'approved'`).get() as { c: number }
  ).c;

  // Strictly real calculations from confirmed payments in DB — zero fabricated revenue!
  const confirmedPayAgg = db
    .prepare(`SELECT COALESCE(SUM(amountMad), 0) as total, COUNT(*) as cnt FROM payments WHERE status = 'Confirmé'`)
    .get() as { total: number; cnt: number };
  const pendingPayAgg = db
    .prepare(`SELECT COALESCE(SUM(remainingMad), 0) as total FROM invoices WHERE remainingMad > 0`)
    .get() as { total: number };

  const bookingsByMonth = db
    .prepare(`SELECT substr(eventDate, 1, 7) as month, COUNT(*) as count FROM bookings GROUP BY substr(eventDate, 1, 7) ORDER BY month ASC LIMIT 12`)
    .all() as { month: string; count: number }[];

  const revenueByMonth = db
    .prepare(`SELECT substr(createdAt, 1, 7) as month, COALESCE(SUM(amountMad), 0) as amountMad FROM payments WHERE status = 'Confirmé' GROUP BY substr(createdAt, 1, 7) ORDER BY month ASC LIMIT 12`)
    .all() as { month: string; amountMad: number }[];

  const recentActivities = db
    .prepare(`SELECT id, adminName, action, targetType, details, createdAt FROM admin_audit_logs ORDER BY id DESC LIMIT 12`)
    .all();

  res.json({
    totalQuotes,
    pendingQuotes,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    upcomingEvents,
    completedEvents,
    totalCustomers,
    totalProviders,
    approvedProviders,
    confirmedRevenueMad: confirmedPayAgg.total,
    receivedPaymentsCount: confirmedPayAgg.cnt,
    pendingPaymentsMad: pendingPayAgg.total,
    bookingsByMonth,
    revenueByMonth,
    recentActivities,
  });
});

// Admin Bookings
app.get('/api/admin/bookings', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const rows = (db.prepare(`SELECT * FROM bookings ORDER BY id DESC`).all() as Record<string, unknown>[]).map((bk) => ({
    ...bk,
    selectedServices: parseJson(bk.selectedServices, [] as string[]),
    options: parseJson(bk.options, [] as string[]),
  }));
  res.json({ bookings: rows });
});

app.put('/api/admin/bookings/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Réservation introuvable.' });
    return;
  }
  const { status, assignedManager, internalComments, estimatedTotalMad } = req.body ?? {};
  const nextStatus = String(status || existing.status);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE bookings SET status = ?, assignedManager = ?, internalComments = ?, estimatedTotalMad = ?, updatedAt = ? WHERE id = ?
  `).run(
    nextStatus,
    assignedManager !== undefined ? String(assignedManager) : String(existing.assignedManager || ''),
    internalComments !== undefined ? String(internalComments) : String(existing.internalComments || ''),
    estimatedTotalMad !== undefined ? Number(estimatedTotalMad) : Number(existing.estimatedTotalMad || 0),
    now,
    id
  );

  // If confirmed and no managed event exists yet for this booking, create one automatically
  if (nextStatus === 'Confirmée') {
    const hasEvent = db.prepare(`SELECT id FROM events WHERE bookingId = ?`).get(id);
    if (!hasEvent) {
      db.prepare(`
        INSERT INTO events (bookingId, quoteId, customerId, title, eventType, eventDate, venue, city, budgetMad, projectManager, currentStage, status, documents, createdAt)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'En préparation', '[]', ?)
      `).run(
        id,
        existing.customerId ? Number(existing.customerId) : null,
        `${String(existing.eventType)} — ${String(existing.clientName)}`,
        String(existing.eventType),
        String(existing.eventDate),
        String(existing.venue),
        String(existing.city),
        Number(estimatedTotalMad ?? existing.estimatedTotalMad ?? 0),
        String(assignedManager ?? existing.assignedManager ?? 'Direction STRONG EVENT PRO'),
        now
      );
    }
  }

  if (existing.userId) {
    createNotification(
      Number(existing.userId),
      `Mise à jour réservation ${String(existing.reference)}`,
      `Le statut de votre réservation est désormais : ${nextStatus}.`
    );
  }
  logAdminAction(req.user!.userId, req.user!.fullName, `Réservation passée à "${nextStatus}"`, 'booking', id, String(existing.reference));
  res.json({ success: true });
});

// Admin Quotes
app.get('/api/admin/quotes', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const rows = (db.prepare(`SELECT * FROM quotes ORDER BY id DESC`).all() as Record<string, unknown>[]).map((q) => ({
    ...q,
    selectedServices: parseJson(q.selectedServices, [] as string[]),
    attachmentUrls: parseJson(q.attachmentUrls, [] as string[]),
    items: db.prepare(`SELECT * FROM quote_items WHERE quoteId = ?`).all(q.id),
  }));
  res.json({ quotes: rows });
});

app.put('/api/admin/quotes/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Devis introuvable.' });
    return;
  }
  const { status, extraFeesMad = 0, discountMad = 0, validityDays = 15, adminNotes = '', items = [] } = req.body ?? {};
  const now = new Date().toISOString();

  let subtotal = 0;
  db.prepare(`DELETE FROM quote_items WHERE quoteId = ?`).run(id);
  const insItem = db.prepare(`INSERT INTO quote_items (quoteId, serviceName, description, quantity, unitPriceMad, totalPriceMad) VALUES (?, ?, ?, ?, ?, ?)`);
  if (Array.isArray(items)) {
    for (const it of items) {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unit = Math.max(0, Number(it.unitPriceMad) || 0);
      const lineTotal = qty * unit;
      subtotal += lineTotal;
      insItem.run(id, String(it.serviceName || 'Prestation'), String(it.description || ''), qty, unit, lineTotal);
    }
  }
  const totalAmountMad = Math.max(0, subtotal + (Number(extraFeesMad) || 0) - (Number(discountMad) || 0));
  const nextStatus = String(status || existing.status);

  db.prepare(`
    UPDATE quotes SET status = ?, extraFeesMad = ?, discountMad = ?, totalAmountMad = ?, validityDays = ?, adminNotes = ?, updatedAt = ?
    WHERE id = ?
  `).run(nextStatus, Number(extraFeesMad) || 0, Number(discountMad) || 0, totalAmountMad, Number(validityDays) || 15, String(adminNotes), now, id);

  if (nextStatus === 'Devis envoyé' && existing.userId) {
    createNotification(
      Number(existing.userId),
      `Devis ${String(existing.reference)} disponible`,
      `Votre devis détaillé d’un montant de ${totalAmountMad.toLocaleString('fr-FR')} MAD est prêt dans votre espace client.`
    );
  }
  logAdminAction(req.user!.userId, req.user!.fullName, `Mise à jour devis (${nextStatus})`, 'quote', id, `${String(existing.reference)} — ${totalAmountMad} MAD`);
  res.json({ success: true, totalAmountMad });
});

// Admin Events, Tasks & Provider Assignments
app.get('/api/admin/events', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const rows = (
    db
      .prepare(`
        SELECT e.*, c.fullName as clientName FROM events e
        LEFT JOIN customers c ON c.id = e.customerId
        ORDER BY e.eventDate ASC
      `)
      .all() as Record<string, unknown>[]
  ).map((ev) => ({
    ...ev,
    documents: parseJson(ev.documents, [] as { name: string; url: string }[]),
    tasks: (db.prepare(`SELECT * FROM tasks WHERE eventId = ? ORDER BY stage ASC, id ASC`).all(ev.id) as Record<string, unknown>[]).map((t) => ({
      ...t,
      isDone: Boolean(t.isDone),
    })),
    assignments: db
      .prepare(`
        SELECT ea.*, p.businessName, p.category FROM event_assignments ea
        LEFT JOIN providers p ON p.id = ea.providerId
        WHERE ea.eventId = ?
      `)
      .all(ev.id),
  }));
  res.json({ events: rows });
});

app.post('/api/admin/events', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.title || !b.eventType || !b.eventDate || !b.venue) {
    res.status(400).json({ error: 'Titre, type, date et lieu sont requis.' });
    return;
  }
  const now = new Date().toISOString();
  const info = db
    .prepare(`
      INSERT INTO events (bookingId, quoteId, customerId, title, eventType, eventDate, venue, city, budgetMad, projectManager, currentStage, status, documents, createdAt)
      VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      b.customerId ? Number(b.customerId) : null,
      String(b.title).trim(),
      String(b.eventType).trim(),
      String(b.eventDate).trim(),
      String(b.venue).trim(),
      String(b.city || 'Casablanca').trim(),
      Number(b.budgetMad) || 0,
      String(b.projectManager || 'Direction').trim(),
      Number(b.currentStage) || 1,
      String(b.status || 'En préparation'),
      JSON.stringify(Array.isArray(b.documents) ? b.documents : []),
      now
    );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Création événement', 'event', info.lastInsertRowid, String(b.title));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/admin/events/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Événement introuvable.' });
    return;
  }
  const b = req.body ?? {};
  db.prepare(`
    UPDATE events SET title = ?, eventType = ?, eventDate = ?, venue = ?, city = ?, budgetMad = ?, projectManager = ?, currentStage = ?, status = ?, documents = ?
    WHERE id = ?
  `).run(
    b.title !== undefined ? String(b.title) : String(existing.title),
    b.eventType !== undefined ? String(b.eventType) : String(existing.eventType),
    b.eventDate !== undefined ? String(b.eventDate) : String(existing.eventDate),
    b.venue !== undefined ? String(b.venue) : String(existing.venue),
    b.city !== undefined ? String(b.city) : String(existing.city),
    b.budgetMad !== undefined ? Number(b.budgetMad) : Number(existing.budgetMad),
    b.projectManager !== undefined ? String(b.projectManager) : String(existing.projectManager),
    b.currentStage !== undefined ? Number(b.currentStage) : Number(existing.currentStage),
    b.status !== undefined ? String(b.status) : String(existing.status),
    b.documents !== undefined ? JSON.stringify(b.documents) : String(existing.documents),
    id
  );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Modification événement', 'event', id);
  res.json({ success: true });
});

app.delete('/api/admin/events/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
  logAdminAction(req.user!.userId, req.user!.fullName, 'Suppression événement', 'event', id);
  res.json({ success: true });
});

app.post('/api/admin/events/:id/tasks', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const eventId = Number(req.params.id);
  const { title, dueDate = '', assignee = '', stage = 1 } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'Intitulé de tâche requis.' });
    return;
  }
  const info = db
    .prepare(`INSERT INTO tasks (eventId, title, dueDate, assignee, isDone, stage, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?)`)
    .run(eventId, String(title).trim(), String(dueDate), String(assignee), Number(stage) || 1, new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/admin/tasks/:taskId', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  const taskId = Number(req.params.taskId);
  const { isDone } = req.body ?? {};
  db.prepare(`UPDATE tasks SET isDone = ? WHERE id = ?`).run(isDone ? 1 : 0, taskId);
  res.json({ success: true });
});

app.delete('/api/admin/tasks/:taskId', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(Number(req.params.taskId));
  res.json({ success: true });
});

app.post('/api/admin/events/:id/assignments', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  const eventId = Number(req.params.id);
  const { providerId, roleLabel, agreedFeeMad = 0 } = req.body ?? {};
  if (!providerId || !roleLabel) {
    res.status(400).json({ error: 'Prestataire et rôle requis.' });
    return;
  }
  const info = db
    .prepare(`INSERT INTO event_assignments (eventId, providerId, roleLabel, agreedFeeMad, status, createdAt) VALUES (?, ?, ?, ?, 'Assigné', ?)`)
    .run(eventId, Number(providerId), String(roleLabel), Number(agreedFeeMad) || 0, new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.delete('/api/admin/assignments/:id', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  db.prepare(`DELETE FROM event_assignments WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true });
});

// Admin Services & Packages
app.get('/api/admin/services', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const services = (db.prepare(`SELECT * FROM services ORDER BY id ASC`).all() as Record<string, unknown>[]).map((s) => ({
    ...s,
    includedItems: parseJson(s.includedItems, [] as string[]),
    options: parseJson(s.options, [] as string[]),
    isAvailable: Boolean(s.isAvailable),
    isActive: Boolean(s.isActive),
  }));
  const packages = (db.prepare(`SELECT * FROM service_packages ORDER BY sortOrder ASC`).all() as Record<string, unknown>[]).map((p) => ({
    ...p,
    includedItems: parseJson(p.includedItems, [] as string[]),
    extraOptions: parseJson(p.extraOptions, [] as string[]),
    isActive: Boolean(p.isActive),
  }));
  res.json({ services, packages });
});

app.post('/api/admin/services', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.name || !b.category || !b.description) {
    res.status(400).json({ error: 'Nom, catégorie et description requis.' });
    return;
  }
  const slug = `${String(b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomInt(100, 999)}`;
  const info = db
    .prepare(`
      INSERT INTO services (slug, category, name, description, includedItems, indicativePriceMad, priceLabel, duration, conditions, isAvailable, isActive, imageUrl, options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      slug,
      String(b.category),
      String(b.name).trim(),
      String(b.description).trim(),
      JSON.stringify(Array.isArray(b.includedItems) ? b.includedItems : []),
      b.indicativePriceMad ? Number(b.indicativePriceMad) : null,
      String(b.priceLabel || (b.indicativePriceMad ? `À partir de ${Number(b.indicativePriceMad).toLocaleString('fr-FR')} MAD` : 'Sur devis')),
      String(b.duration || 'Sur mesure'),
      String(b.conditions || ''),
      b.isAvailable === false ? 0 : 1,
      b.isActive === false ? 0 : 1,
      String(b.imageUrl || '/src/assets/images/service_wedding_decor_1795461363397.jpg'),
      JSON.stringify(Array.isArray(b.options) ? b.options : [])
    );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Ajout prestation', 'service', info.lastInsertRowid, String(b.name));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/admin/services/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM services WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Prestation introuvable.' });
    return;
  }
  const b = req.body ?? {};
  db.prepare(`
    UPDATE services SET category = ?, name = ?, description = ?, includedItems = ?, indicativePriceMad = ?, priceLabel = ?, duration = ?, conditions = ?, isAvailable = ?, isActive = ?, imageUrl = ?, options = ?
    WHERE id = ?
  `).run(
    b.category ?? existing.category,
    b.name ?? existing.name,
    b.description ?? existing.description,
    b.includedItems ? JSON.stringify(b.includedItems) : existing.includedItems,
    b.indicativePriceMad !== undefined ? (b.indicativePriceMad ? Number(b.indicativePriceMad) : null) : existing.indicativePriceMad,
    b.priceLabel ?? existing.priceLabel,
    b.duration ?? existing.duration,
    b.conditions ?? existing.conditions,
    b.isAvailable !== undefined ? (b.isAvailable ? 1 : 0) : existing.isAvailable,
    b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.isActive,
    b.imageUrl ?? existing.imageUrl,
    b.options ? JSON.stringify(b.options) : existing.options,
    id
  );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Modification prestation', 'service', id);
  res.json({ success: true });
});

app.delete('/api/admin/services/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  db.prepare(`DELETE FROM services WHERE id = ?`).run(Number(req.params.id));
  logAdminAction(req.user!.userId, req.user!.fullName, 'Suppression prestation', 'service', req.params.id);
  res.json({ success: true });
});

app.put('/api/admin/packages/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM service_packages WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Formule introuvable.' });
    return;
  }
  const b = req.body ?? {};
  db.prepare(`UPDATE service_packages SET name = ?, subtitle = ?, description = ?, indicativePriceMad = ?, isActive = ? WHERE id = ?`).run(
    b.name ?? existing.name,
    b.subtitle ?? existing.subtitle,
    b.description ?? existing.description,
    b.indicativePriceMad !== undefined ? (b.indicativePriceMad ? Number(b.indicativePriceMad) : null) : existing.indicativePriceMad,
    b.isActive !== undefined ? (b.isActive ? 1 : 0) : existing.isActive,
    id
  );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Modification formule', 'package', id);
  res.json({ success: true });
});

// Admin Providers
app.get('/api/admin/providers', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const rows = (db.prepare(`SELECT * FROM providers ORDER BY id DESC`).all() as Record<string, unknown>[]).map((p) => ({
    ...p,
    servicesOffered: parseJson(p.servicesOffered, [] as string[]),
    galleryUrls: parseJson(p.galleryUrls, [] as string[]),
    isDemo: Boolean(p.isDemo),
  }));
  res.json({ providers: rows });
});

app.post('/api/admin/providers', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.businessName || !b.category || !b.description) {
    res.status(400).json({ error: 'Nom commercial, catégorie et description requis.' });
    return;
  }
  const info = db
    .prepare(`
      INSERT INTO providers (userId, businessName, category, description, city, phone, email, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `)
    .run(
      String(b.businessName).trim(),
      String(b.category).trim(),
      String(b.description).trim(),
      String(b.city || 'Casablanca').trim(),
      String(b.phone || '').trim(),
      String(b.email || '').trim(),
      b.indicativePriceMad ? Number(b.indicativePriceMad) : null,
      JSON.stringify(Array.isArray(b.servicesOffered) ? b.servicesOffered : []),
      JSON.stringify(Array.isArray(b.galleryUrls) ? b.galleryUrls : []),
      String(b.availabilityNotes || '').trim(),
      String(b.imageUrl || '/src/assets/images/agency_casablanca_atelier_1795461365161.jpg'),
      String(b.validationStatus || 'approved'),
      new Date().toISOString()
    );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Ajout prestataire', 'provider', info.lastInsertRowid, String(b.businessName));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.put('/api/admin/providers/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM providers WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Prestataire introuvable.' });
    return;
  }
  const b = req.body ?? {};
  db.prepare(`
    UPDATE providers SET businessName = ?, category = ?, description = ?, city = ?, phone = ?, email = ?, indicativePriceMad = ?, availabilityNotes = ?, validationStatus = ?
    WHERE id = ?
  `).run(
    b.businessName ?? existing.businessName,
    b.category ?? existing.category,
    b.description ?? existing.description,
    b.city ?? existing.city,
    b.phone ?? existing.phone,
    b.email ?? existing.email,
    b.indicativePriceMad !== undefined ? (b.indicativePriceMad ? Number(b.indicativePriceMad) : null) : existing.indicativePriceMad,
    b.availabilityNotes ?? existing.availabilityNotes,
    b.validationStatus ?? existing.validationStatus,
    id
  );
  logAdminAction(req.user!.userId, req.user!.fullName, `Prestataire mis à jour (${b.validationStatus ?? existing.validationStatus})`, 'provider', id);
  res.json({ success: true });
});

app.delete('/api/admin/providers/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  db.prepare(`DELETE FROM providers WHERE id = ?`).run(Number(req.params.id));
  logAdminAction(req.user!.userId, req.user!.fullName, 'Suppression prestataire', 'provider', req.params.id);
  res.json({ success: true });
});

// Admin Customers
app.get('/api/admin/customers', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const customers = db.prepare(`SELECT * FROM customers ORDER BY id DESC`).all() as Record<string, unknown>[];
  const enriched = customers.map((c) => ({
    ...c,
    quotesCount: (db.prepare(`SELECT COUNT(*) as cnt FROM quotes WHERE customerId = ?`).get(c.id) as { cnt: number }).cnt,
    bookingsCount: (db.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE customerId = ?`).get(c.id) as { cnt: number }).cnt,
    eventsCount: (db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE customerId = ?`).get(c.id) as { cnt: number }).cnt,
  }));
  res.json({ customers: enriched });
});

app.put('/api/admin/customers/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { fullName, phone, company, city, notes } = req.body ?? {};
  db.prepare(`UPDATE customers SET fullName = ?, phone = ?, company = ?, city = ?, notes = ? WHERE id = ?`).run(
    String(fullName || ''),
    String(phone || ''),
    String(company || ''),
    String(city || 'Casablanca'),
    String(notes || ''),
    id
  );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Modification fiche client', 'customer', id);
  res.json({ success: true });
});

// Admin Portfolio
app.get('/api/admin/portfolio', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const items = (db.prepare(`SELECT * FROM portfolio ORDER BY id DESC`).all() as Record<string, unknown>[]).map((p) => ({
    ...p,
    galleryUrls: parseJson(p.galleryUrls, [] as string[]),
    isDemo: Boolean(p.isDemo),
  }));
  res.json({ portfolio: items });
});

app.post('/api/admin/portfolio', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  if (!b.title || !b.eventType || !b.description) {
    res.status(400).json({ error: 'Titre, type et description requis.' });
    return;
  }
  const info = db
    .prepare(`
      INSERT INTO portfolio (title, eventType, eventDate, city, description, galleryUrls, videoUrl, testimonialQuote, testimonialAuthor, isDemo, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      String(b.title).trim(),
      String(b.eventType).trim(),
      String(b.eventDate || new Date().toISOString().slice(0, 10)),
      String(b.city || 'Casablanca').trim(),
      String(b.description).trim(),
      JSON.stringify(Array.isArray(b.galleryUrls) && b.galleryUrls.length ? b.galleryUrls : ['/src/assets/images/hero_luxury_gala_1795461362786.jpg']),
      String(b.videoUrl || ''),
      String(b.testimonialQuote || ''),
      String(b.testimonialAuthor || ''),
      b.isDemo ? 1 : 0,
      new Date().toISOString()
    );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Publication réalisation', 'portfolio', info.lastInsertRowid, String(b.title));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.delete('/api/admin/portfolio/:id', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  db.prepare(`DELETE FROM portfolio WHERE id = ?`).run(Number(req.params.id));
  logAdminAction(req.user!.userId, req.user!.fullName, 'Suppression réalisation', 'portfolio', req.params.id);
  res.json({ success: true });
});

// Admin Payments & Invoices (Manual confirmation required — never auto-confirmed!)
app.get('/api/admin/payments', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const payments = db
    .prepare(`
      SELECT p.*, c.fullName as clientName FROM payments p
      LEFT JOIN customers c ON c.id = p.customerId
      ORDER BY p.id DESC
    `)
    .all();
  const invoices = db
    .prepare(`
      SELECT i.*, c.fullName as clientName FROM invoices i
      LEFT JOIN customers c ON c.id = i.customerId
      ORDER BY i.id DESC
    `)
    .all();
  res.json({ payments, invoices });
});

app.post('/api/admin/payments', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  const amountMad = Number(b.amountMad);
  if (!amountMad || amountMad <= 0) {
    res.status(400).json({ error: 'Montant en MAD valide requis.' });
    return;
  }
  const now = new Date().toISOString();
  const reference = generateRef('PAY');
  const status = b.status === 'Confirmé' ? 'Confirmé' : 'En attente';

  const info = db
    .prepare(`
      INSERT INTO payments (reference, eventId, bookingId, quoteId, customerId, paymentType, amountMad, method, status, confirmedBy, paidAt, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      reference,
      b.eventId ? Number(b.eventId) : null,
      b.bookingId ? Number(b.bookingId) : null,
      b.quoteId ? Number(b.quoteId) : null,
      b.customerId ? Number(b.customerId) : null,
      ['Acompte', 'Complément', 'Solde'].includes(b.paymentType) ? b.paymentType : 'Acompte',
      amountMad,
      String(b.method || 'Virement bancaire'),
      status,
      status === 'Confirmé' ? req.user!.fullName : '',
      status === 'Confirmé' ? now : '',
      String(b.notes || ''),
      now
    );

  // If confirmed and linked to an invoice/quote/event, recalculate paid & remaining balance
  if (status === 'Confirmé' && (b.invoiceId || b.quoteId || b.eventId)) {
    const inv = db
      .prepare(`SELECT * FROM invoices WHERE id = ? OR quoteId = ? OR eventId = ? LIMIT 1`)
      .get(Number(b.invoiceId || 0), Number(b.quoteId || 0), Number(b.eventId || 0)) as
      | { id: number; totalMad: number; paidMad: number; customerId: number | null }
      | undefined;
    if (inv) {
      const nextPaid = inv.paidMad + amountMad;
      const nextRemaining = Math.max(0, inv.totalMad - nextPaid);
      const nextInvStatus = nextRemaining === 0 ? 'Soldée' : 'Partiellement réglée';
      db.prepare(`UPDATE invoices SET paidMad = ?, remainingMad = ?, status = ? WHERE id = ?`).run(nextPaid, nextRemaining, nextInvStatus, inv.id);
    }
  }

  logAdminAction(req.user!.userId, req.user!.fullName, `Enregistrement paiement (${status})`, 'payment', info.lastInsertRowid, `${amountMad} MAD`);
  res.status(201).json({ id: Number(info.lastInsertRowid), reference, status });
});

app.put('/api/admin/payments/:id/confirm', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!payment) {
    res.status(404).json({ error: 'Paiement introuvable.' });
    return;
  }
  if (payment.status === 'Confirmé') {
    res.json({ success: true });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(`UPDATE payments SET status = 'Confirmé', confirmedBy = ?, paidAt = ? WHERE id = ?`).run(req.user!.fullName, now, id);

  const inv = db
    .prepare(`SELECT * FROM invoices WHERE quoteId = ? OR eventId = ? OR customerId = ? LIMIT 1`)
    .get(Number(payment.quoteId || 0), Number(payment.eventId || 0), Number(payment.customerId || 0)) as
    | { id: number; totalMad: number; paidMad: number; customerId: number | null }
    | undefined;
  if (inv) {
    const nextPaid = inv.paidMad + Number(payment.amountMad);
    const nextRemaining = Math.max(0, inv.totalMad - nextPaid);
    const nextInvStatus = nextRemaining === 0 ? 'Soldée' : 'Partiellement réglée';
    db.prepare(`UPDATE invoices SET paidMad = ?, remainingMad = ?, status = ? WHERE id = ?`).run(nextPaid, nextRemaining, nextInvStatus, inv.id);
  }
  logAdminAction(req.user!.userId, req.user!.fullName, 'Confirmation manuelle de paiement', 'payment', id, `${String(payment.amountMad)} MAD`);
  res.json({ success: true });
});

// Admin Content & Settings
app.get('/api/admin/content', requireAdmin, enforceAdminPasswordUpdated, (_req, res) => {
  const settings = getSafeSettings();
  const articles = db.prepare(`SELECT * FROM news_articles ORDER BY id DESC`).all();
  const faqs = db.prepare(`SELECT * FROM faqs ORDER BY sortOrder ASC`).all();
  const contacts = db.prepare(`SELECT * FROM contact_messages ORDER BY id DESC LIMIT 50`).all();
  const newsletter = db.prepare(`SELECT * FROM newsletter_subscribers ORDER BY id DESC`).all();
  const messages = db.prepare(`SELECT * FROM messages ORDER BY id DESC LIMIT 50`).all();
  res.json({ settings, articles, faqs, contacts, newsletter, messages });
});

app.put('/api/admin/settings', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const b = req.body ?? {};
  const curr = getSafeSettings();
  db.prepare(`
    UPDATE store_settings SET
      address = ?, phone = ?, whatsappNumber = ?, email = ?, openingHours = ?,
      googleMapsEmbedUrl = ?, googleMapsLink = ?, heroTitle = ?, heroSubtitle = ?,
      aboutText = ?, socialLinks = ?, emailNotificationsEnabled = ?, whatsappNotificationsEnabled = ?,
      legalMentions = ?, privacyPolicy = ?, termsOfSale = ?
    WHERE id = 1
  `).run(
    b.address ?? curr.address,
    b.phone ?? curr.phone,
    b.whatsappNumber ?? curr.whatsappNumber,
    b.email ?? curr.email,
    b.openingHours ?? curr.openingHours,
    b.googleMapsEmbedUrl ?? curr.googleMapsEmbedUrl,
    b.googleMapsLink ?? curr.googleMapsLink,
    b.heroTitle ?? curr.heroTitle,
    b.heroSubtitle ?? curr.heroSubtitle,
    b.aboutText ?? curr.aboutText,
    JSON.stringify(b.socialLinks ?? curr.socialLinks),
    b.emailNotificationsEnabled ? 1 : 0,
    b.whatsappNotificationsEnabled ? 1 : 0,
    b.legalMentions ?? curr.legalMentions,
    b.privacyPolicy ?? curr.privacyPolicy,
    b.termsOfSale ?? curr.termsOfSale
  );
  logAdminAction(req.user!.userId, req.user!.fullName, 'Mise à jour des paramètres & contenu', 'settings', 1);
  res.json({ success: true, settings: getSafeSettings() });
});

app.post('/api/admin/articles', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const { title, category, excerpt, content, imageUrl } = req.body ?? {};
  if (!title || !excerpt || !content) {
    res.status(400).json({ error: 'Titre, résumé et contenu requis.' });
    return;
  }
  const slug = `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomInt(100, 999)}`;
  const info = db
    .prepare(`INSERT INTO news_articles (slug, title, category, excerpt, content, imageUrl, publishedAt, isPublished) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(slug, String(title).trim(), String(category || 'Conseils').trim(), String(excerpt).trim(), String(content).trim(), String(imageUrl || '/src/assets/images/agency_casablanca_atelier_1795461365161.jpg'), new Date().toISOString());
  logAdminAction(req.user!.userId, req.user!.fullName, 'Publication article', 'article', info.lastInsertRowid, String(title));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.delete('/api/admin/articles/:id', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  db.prepare(`DELETE FROM news_articles WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true });
});

app.post('/api/admin/faqs', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  const { question, answer } = req.body ?? {};
  if (!question || !answer) {
    res.status(400).json({ error: 'Question et réponse requises.' });
    return;
  }
  const info = db.prepare(`INSERT INTO faqs (question, answer, sortOrder, isPublished) VALUES (?, ?, 10, 1)`).run(String(question).trim(), String(answer).trim());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.delete('/api/admin/faqs/:id', requireAdmin, enforceAdminPasswordUpdated, (req, res) => {
  db.prepare(`DELETE FROM faqs WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true });
});

app.post('/api/admin/messages/reply', requireAdmin, enforceAdminPasswordUpdated, (req: AuthenticatedRequest, res) => {
  const { userId, subject, body } = req.body ?? {};
  if (!userId || !body) {
    res.status(400).json({ error: 'Destinataire et message requis.' });
    return;
  }
  db.prepare(`INSERT INTO messages (userId, senderRole, senderName, subject, body, isRead, createdAt) VALUES (?, 'admin', ?, ?, ?, 0, ?)`).run(
    Number(userId),
    'Équipe STRONG EVENT PRO',
    String(subject || 'Réponse de votre chef de projet'),
    String(body).trim(),
    new Date().toISOString()
  );
  createNotification(Number(userId), 'Nouveau message de l’équipe', String(body).slice(0, 120));
  res.status(201).json({ success: true });
});

// ---------------- VITE DEV / PROD STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STRONG EVENT PRO server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
