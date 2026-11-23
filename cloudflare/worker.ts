/* eslint-disable @typescript-eslint/no-explicit-any */
// Cloudflare Workers Full-Stack Entry Point for STRONG EVENT PRO
// Runtime: Cloudflare Workers + Static Assets (./dist) + D1 (SQLite) + R2 (Uploads)

interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta: {
    last_row_id?: number;
    changes?: number;
  };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  UPLOADS?: R2Bucket;
  SESSION_SECRET?: string;
  INITIAL_ADMIN_PASSWORD?: string;
}

interface TokenPayload {
  userId: number;
  role: 'admin' | 'client' | 'provider';
  email: string;
  fullName: string;
  exp: number;
}

const IMG_HERO = '/src/assets/images/hero_luxury_gala_1795461362786.jpg';
const IMG_WEDDING = '/src/assets/images/service_wedding_decor_1795461363397.jpg';
const IMG_CORP = '/src/assets/images/service_corporate_gala_1795461364781.jpg';
const IMG_CATERING = '/src/assets/images/service_luxury_catering_1795461365116.jpg';
const IMG_SOUND = '/src/assets/images/service_sound_lighting_1795461365759.jpg';
const IMG_ATELIER = '/src/assets/images/agency_casablanca_atelier_1795461365161.jpg';

const FALLBACK_SECRET = Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');

function getSecret(env: Env): string {
  return env.SESSION_SECRET && env.SESSION_SECRET.trim().length >= 16
    ? env.SESSION_SECRET.trim()
    : FALLBACK_SECRET;
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(data: Uint8Array): string {
  let str = '';
  for (const b of data) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2:${toHex(salt)}:${toHex(derived)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const salt = fromHex(parts[1]);
  const expected = fromHex(parts[2]);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return timingSafeEqualBytes(new Uint8Array(derived), expected);
}

async function signToken(payload: Omit<TokenPayload, 'exp'>, env: Env, ttlSeconds = 60 * 60 * 12): Promise<string> {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function verifyToken(token: string, env: Env): Promise<TokenPayload | null> {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getSecret(env)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))
    );
    const actual = base64UrlDecode(sig);
    if (!timingSafeEqualBytes(actual, expected)) return null;
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as TokenPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

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
  const arr = crypto.getRandomValues(new Uint32Array(1));
  const rand = 1000 + (arr[0] % 9000);
  return `${prefix}-${year}-${rand}`;
}

async function getAuthUser(req: Request, env: Env): Promise<TokenPayload | null> {
  const header = req.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return verifyToken(header.slice(7).trim(), env);
}

let seededPromise: Promise<void> | null = null;

async function ensureSeeded(db: D1Database, env: Env): Promise<void> {
  if (seededPromise) return seededPromise;
  seededPromise = (async () => {
    const now = new Date().toISOString();
    const admin = await db
      .prepare(`SELECT id FROM users WHERE username = 'Admin' OR role = 'admin' LIMIT 1`)
      .first();

    if (!admin) {
      const initialPass = env.INITIAL_ADMIN_PASSWORD || '123456789';
      await db
        .prepare(
          `INSERT INTO users (username, email, fullName, phone, city, company, passwordHash, role, mustChangePassword, createdAt, updatedAt)
           VALUES (?, ?, ?, '', 'Casablanca', 'STRONG EVENT PRO', ?, 'admin', 1, ?, ?)`
        )
        .bind('Admin', 'admin@strongeventpro.local', 'Direction STRONG EVENT PRO', await hashPassword(initialPass), now, now)
        .run();
    }

    const settings = await db.prepare(`SELECT id FROM store_settings WHERE id = 1`).first();
    if (!settings) {
      await db
        .prepare(
          `INSERT INTO store_settings (
            id, agencyName, slogan, city, address, phone, whatsappNumber, email, openingHours,
            googleMapsEmbedUrl, googleMapsLink, heroTitle, heroSubtitle, heroImageUrl, aboutText,
            socialLinks, budgetRanges, emailNotificationsEnabled, whatsappNotificationsEnabled,
            legalMentions, privacyPolicy, termsOfSale
          ) VALUES (1, ?, ?, ?, '', '', '', '', ?, '', '', ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
        )
        .bind(
          'STRONG EVENT PRO',
          'Vos événements, notre expertise.',
          'Casablanca, Maroc',
          'Lundi – Samedi : 09h00 – 19h00 (sur rendez-vous)',
          'Créons ensemble des événements inoubliables.',
          'De la conception à la réalisation, STRONG EVENT PRO transforme vos idées en expériences exceptionnelles.',
          IMG_HERO,
          'Basée à Casablanca, STRONG EVENT PRO réunit scénographes, directeurs de production et prestataires sélectionnés pour orchestrer vos réceptions privées, sommets d’entreprise et soirées d’envergure à travers tout le Maroc.',
          JSON.stringify({ instagram: '', linkedin: '', facebook: '', tiktok: '' }),
          JSON.stringify([
            'Moins de 30 000 MAD',
            '30 000 – 80 000 MAD',
            '80 000 – 150 000 MAD',
            '150 000 – 300 000 MAD',
            'Plus de 300 000 MAD',
          ]),
          'STRONG EVENT PRO — Agence événementielle à Casablanca, Maroc. Mentions légales configurables depuis l’administration.',
          'Les données collectées via les formulaires de devis et de réservation sont traitées exclusivement pour l’organisation de vos événements.',
          'Toute réservation est soumise à validation des disponibilités et confirmation écrite par notre équipe à Casablanca.'
        )
        .run();
    }

    const catRow = await db.prepare(`SELECT COUNT(*) as c FROM event_categories`).first<{ c: number }>();
    if ((catRow?.c ?? 0) === 0) {
      const cats: [string, string, string, string, string, string, string, string[]][] = [
        ['mariages', 'Événements Privés', 'Mariages', 'حفلات الزفاف', 'Weddings', 'Célébrations nuptiales sur mesure mêlant élégance contemporaine et raffinement marocain à Casablanca.', IMG_WEDDING, ['Scénographie & Décoration florale', 'Traiteur gastronomique', 'Photo & Cinéma', 'Coordination complète']],
        ['fiancailles', 'Événements Privés', 'Fiançailles', 'حفلات الخطوبة', 'Engagements', 'Réceptions intimes et cérémonies de fiançailles pensées dans les moindres détails.', IMG_WEDDING, ['Décoration de réception', 'Pâtisserie fine', 'Photographe', 'Musique d’ambiance']],
        ['anniversaires', 'Événements Privés', 'Anniversaires', 'أعياد الميلاد', 'Birthdays', 'Soirées d’anniversaire privées, dîners assis ou cocktails festifs dans des lieux d’exception.', IMG_SOUND, ['DJ & Sonorisation', 'Cake design', 'Éclairage scénique', 'Photobooth']],
        ['baptemes', 'Événements Privés', 'Baptêmes', 'حفلات العقيقة', 'Baptisms & Naming', 'Accueil chaleureux de vos proches autour d’une décoration douce et d’une restauration soignée.', IMG_CATERING, ['Décoration thématique', 'Buffet sucré-salé', 'Couverture photo']],
        ['baby-showers', 'Événements Privés', 'Baby showers', 'حفلات استقبال المولود', 'Baby Showers', 'Après-midis élégants avec mise en scène florale et animations dédiées.', IMG_ATELIER, ['Décoration personnalisée', 'Pâtisserie thématique', 'Invitations numériques']],
        ['soirees-privees', 'Événements Privés', 'Soirées privées', 'سهرات خاصة', 'Private Parties', 'Réceptions exclusives en villa ou rooftop avec direction artistique dédiée.', IMG_SOUND, ['DJ & Éclairage architectural', 'Cocktails signature', 'Sécurité & Logistique']],
        ['receptions', 'Événements Privés', 'Réceptions', 'حفلات استقبال', 'Receptions', 'Dîners de prestige et réceptions officielles orchestrés avec rigueur.', IMG_HERO, ['Art de la table', 'Service en salle', 'Traiteur haute cuisine']],
        ['celebrations-familiales', 'Événements Privés', 'Célébrations familiales', 'احتفالات عائلية', 'Family Celebrations', 'Retrouvailles, noces d’or et cérémonies familiales clés en main.', IMG_WEDDING, ['Location de mobilier', 'Traiteur', 'Reportage photo']],
        ['seminaires', 'Événements Professionnels', 'Séminaires', 'ندوات مهنية', 'Seminars', 'Journées d’étude et séminaires d’entreprise dans des cadres propices à la réflexion.', IMG_CORP, ['Sonorisation conférence', 'Écrans LED', 'Pauses café & Déjeuner']],
        ['conferences', 'Événements Professionnels', 'Conférences', 'مؤتمرات', 'Conferences', 'Production audiovisuelle complète, accueil VIP et gestion de flux pour conférences à Casablanca.', IMG_CORP, ['Captation vidéo multi-caméras', 'Vidéoprojection', 'Signalétique']],
        ['congres', 'Événements Professionnels', 'Congrès', 'مؤتمرات كبرى', 'Congresses', 'Ingénierie logistique pour congrès nationaux et internationaux multi-salles.', IMG_CORP, ['Régie technique complète', 'Accueil hôtesses', 'Supports imprimés']],
        ['galas', 'Événements Professionnels', 'Galas', 'حفلات العشاء الرسمية', 'Corporate Galas', 'Dîners de gala prestigieux, remises de trophées et soirées institutionnelles.', IMG_HERO, ['Scénographie de prestige', 'Dîner gastronomique', 'Animation musicale live']],
        ['lancements-produits', 'Événements Professionnels', 'Lancements de produits', 'إطلاق المنتجات', 'Product Launches', 'Mises en scène immersives pour révéler vos marques et innovations auprès des médias.', IMG_SOUND, ['Scénographie sur mesure', 'Couverture réseaux sociaux', 'Cocktail dînatoire']],
        ['soirees-entreprise', 'Événements Professionnels', 'Soirées d’entreprise', 'سهرات الشركات', 'Corporate Evenings', 'Fêtes annuelles et soirées de remerciement fédératrices pour vos équipes.', IMG_SOUND, ['DJ & Live Band', 'Photobooth corporate', 'Buffet gastronomique']],
        ['team-building', 'Événements Professionnels', 'Team building', 'بناء الفرق', 'Team Building', 'Activités collaboratives et expériences fédératrices sur mesure.', IMG_ATELIER, ['Animation & Coaching', 'Logistique terrain', 'Restauration']],
        ['salons-professionnels', 'Événements Professionnels', 'Salons professionnels', 'معارض مهنية', 'Trade Shows', 'Conception de stands, signalétique et logistique pour exposants.', IMG_CORP, ['Design de stand', 'Mobilier & Éclairage', 'Communication visuelle']],
        ['inaugurations', 'Événements Professionnels', 'Inaugurations', 'حفلات الافتتاح', 'Inaugurations', 'Ouvertures de showrooms, sièges sociaux et boutiques avec protocole complet.', IMG_HERO, ['Coupure de ruban', 'Cocktail VIP', 'Reportage photo & vidéo']],
        ['concerts', 'Événements Festifs', 'Concerts', 'حفلات موسيقية', 'Concerts', 'Production scénique, acoustique et éclairage haute puissance pour concerts.', IMG_SOUND, ['Sonorisation concert', 'Éclairage asservi', 'Régie scène']],
        ['festivals', 'Événements Festifs', 'Festivals', 'مهرجانات', 'Festivals', 'Coordination multi-scènes, tentes, logistique visiteurs et sécurité.', IMG_SOUND, ['Tentes & Chapiteaux', 'Son & Lumière', 'Gestion flux']],
        ['soirees-vip', 'Événements Festifs', 'Soirées VIP', 'سهرات كبار الشخصيات', 'VIP Evenings', 'Accès privé, conciergerie artistique et atmosphère feutrée haut de gamme.', IMG_HERO, ['Lounge design', 'Mixologie', 'DJ résident']],
        ['evenements-musicaux', 'Événements Festifs', 'Événements musicaux', 'فعاليات موسيقية', 'Musical Events', 'Showcases, orchestres andalous, jazz ou fusion contemporaine.', IMG_SOUND, ['Groupes musicaux', 'Ingénierie son', 'Scénographie']],
        ['fetes-theme', 'Événements Festifs', 'Fêtes à thème', 'حفلات ذات طابع خاص', 'Themed Parties', 'Univers immersifs créés sur mesure : Gatsby, Mille et Une Nuits, Blanc & Or.', IMG_WEDDING, ['Décoration thématique', 'Animation artistique', 'Invitations dédiées']],
      ];
      await db.batch(
        cats.map((c) =>
          db
            .prepare(
              `INSERT INTO event_categories (slug, groupName, name, nameAr, nameEn, description, coverImage, includedServices) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(c[0], c[1], c[2], c[3], c[4], c[5], c[6], JSON.stringify(c[7]))
        )
      );
    }

    const srvRow = await db.prepare(`SELECT COUNT(*) as c FROM services`).first<{ c: number }>();
    if ((srvRow?.c ?? 0) === 0) {
      const srvs: [string, string, string, string, string[], number | null, string, string, string, string, string[]][] = [
        ['scenographie-decoration-mariage', 'Décoration', 'Scénographie & Décoration de Mariage', 'Conception globale de votre décor nuptial : arches florales, tables d’honneur, bougeoirs dorés et harmonies textiles sur mesure.', ['Étude scénographique 3D', 'Composition florale fraîche', 'Dressage de tables & linge ivore', 'Installation et désinstallation'], 28000, 'À partir de 28 000 MAD', 'Préparation 48h + Jour J', 'Acompte de 40 % à la validation du cahier scénographique.', IMG_WEDDING, ['Arche florale XXL', 'Chemin de table bougies cristal', 'Coin photo personnalisé']],
        ['decoration-florale-tables', 'Décoration', 'Décoration Florale & Art de la Table', 'Centres de table botaniques, orchidées blanches, vaisselle dorée et papeterie de table raffinée pour dîners privés ou galas.', ['Fleurs de saison sélectionnées', 'Chandeliers en laiton brossé', 'Menus imprimés', 'Mise en place par nos fleuristes'], 9500, 'À partir de 9 500 MAD', 'Installation le jour J', 'Tarif variable selon le nombre de tables (base 10 tables).', IMG_ATELIER, ['Orchidées Phalaenopsis', 'Nappage lin naturel', 'Marque-places calligraphiés']],
        ['traiteur-gastronomique-banquet', 'Restauration', 'Traiteur Gastronomique & Banquets', 'Cuisine marocaine contemporaine et gastronomie internationale orchestrée par nos chefs avec brigade de service complète.', ['Menu dégustation préalable', 'Pièces cocktails & dîner assis', 'Personnel de service en tenue', 'Vaisselle et verrerie premium'], 450, 'À partir de 450 MAD / convive', 'Service complet 6h', 'Minimum 40 convives. Options halal, végétariennes et sans allergènes.', IMG_CATERING, ['Atelier show-cooking', 'Bar à pâtisseries fines', 'Service thé à la menthe cérémonial']],
        ['cocktails-buffets-corporate', 'Restauration', 'Cocktails Dînatoires & Buffets Corporate', 'Formules dynamiques et raffinées adaptées aux séminaires, lancements de produits et inaugurations à Casablanca.', ['Pièces salées & sucrées chaudes/froides', 'Boissons fraîches & café de spécialité', 'Maîtres d’hôtel dédiés', 'Dressage sur plateaux travertin'], 320, 'À partir de 320 MAD / personne', '3h à 5h de service', 'Confirmation finale des effectifs 7 jours avant l’événement.', IMG_CATERING, ['Fontaine de jus pressés', 'Pause café VIP matin & après-midi']],
        ['dj-sonorisation-eclairage', 'Sonorisation & Animation', 'DJ, Sonorisation & Éclairage Architectural', 'Système son haute fidélité, DJ généraliste ou électro-oriental et mise en lumière architecturale des façades et salles.', ['Régie Pioneer & enceintes ligne-array', 'Projecteurs architecturaux LED chaud', 'DJ professionnel + technicien son', 'Micros sans fil HF'], 14000, 'À partir de 14 000 MAD', 'Soirée jusqu’à 03h00', 'Nécessite un accès électrique conforme et un espace régie dédié.', IMG_SOUND, ['Machine à étincelles froides', 'Mur LED P3 haute définition', 'Éclairage piste asservi']],
        ['groupes-musicaux-live', 'Sonorisation & Animation', 'Orchestres Live & Ensembles Musicaux', 'Quatuors à cordes, orchestres andalous, groupes jazz ou formations chaâbi chic sélectionnés pour sublimer chaque temps fort.', ['Artistes professionnels vérifiés', 'Balance acoustique avant arrivée', 'Répertoire personnalisé', 'Coordination avec le maître de cérémonie'], 18000, 'À partir de 18 000 MAD', '2 à 4 sets de 45 min', 'Loges et rafraîchissements requis pour les musiciens.', IMG_SOUND, ['Violoniste d’accueil', 'Issawa / Dakka Marrakchia prestige', 'Trio Jazz cocktail']],
        ['photographe-videaste-cinema', 'Photo & Vidéo', 'Photographie Éditoriale & Film Cinéma', 'Couverture complète en duo photo + vidéo 4K avec étalonnage cinéma, teaser rapide et galerie privée haute définition.', ['2 photographes/vidéastes seniors', 'Captation drone (sous autorisation)', 'Film complet + teaser 3 min', 'Galerie numérique privée'], 16000, 'À partir de 16 000 MAD', 'Couverture jusqu’à 10h', 'Livraison du teaser sous 7 jours ouvrés et reportage complet sous 21 jours.', IMG_HERO, ['Photobooth miroir doré', 'Album fine-art relié lin', 'SDE (Same Day Edit) projeté le soir même']],
        ['capture-conference-streaming', 'Photo & Vidéo', 'Captation Conférence & Diffusion Multi-Caméras', 'Enregistrement multi-angles, incrustation des présentations et streaming privé pour vos congrès et séminaires.', ['3 caméras HD/4K sur régie', 'Prise de son directe console', 'Montage chapitré par intervenant', 'Export réseaux sociaux'], 15000, 'À partir de 15 000 MAD', 'Journée complète (8h)', 'Test technique J-1 inclus sur site à Casablanca.', IMG_CORP, ['Streaming privé sécurisé', 'Interviews participants à chaud']],
        ['logistique-mobilier-chapiteaux', 'Logistique', 'Location de Mobilier, Tentes & Logistique Complète', 'Chapiteaux transparents, chaises médaillon velours, tables banquets, transport et équipes de montage certifiées.', ['Transport aller-retour Casablanca & région', 'Mobilier design entretenu', 'Tentes modulaires avec plancher', 'Équipe montage et démontage'], 12000, 'À partir de 12 000 MAD', 'Location 24h à 72h', 'Visite technique préalable obligatoire pour les installations extérieures.', IMG_CORP, ['Chauffages extérieurs design', 'Groupe électrogène silencieux', 'Piste de danse miroir']],
        ['communication-identite-invitations', 'Communication', 'Identité Visuelle, Invitations Numériques & Couverture Sociale', 'Création du monogramme ou charte de l’événement, invitations interactives WhatsApp/web avec suivi RSVP et couverture live.', ['Monogramme & charte graphique', 'Site / invitation RSVP digitale', 'Supports imprimés (programmes, badges)', 'Reels temps réel'], 7500, 'À partir de 7 500 MAD', 'Livraison sous 10 jours', 'Validation des maquettes avant lancement d’impression.', IMG_ATELIER, ['Impression papier coton dorure à chaud', 'Community manager sur site']],
      ];
      await db.batch(
        srvs.map((s) =>
          db
            .prepare(
              `INSERT INTO services (slug, category, name, description, includedItems, indicativePriceMad, priceLabel, duration, conditions, imageUrl, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(s[0], s[1], s[2], s[3], JSON.stringify(s[4]), s[5], s[6], s[7], s[8], s[9], JSON.stringify(s[10]))
        )
      );
    }

    const pkgRow = await db.prepare(`SELECT COUNT(*) as c FROM service_packages`).first<{ c: number }>();
    if ((pkgRow?.c ?? 0) === 0) {
      const pkgs: [string, string, string, string, string[], string[], number | null, number][] = [
        ['pack-essentiel', 'PACK ESSENTIEL', 'Organisation cadrée & coordination fluide', 'Idéal pour les réceptions intimes ou réunions professionnelles disposant déjà de leur lieu et souhaitant une exécution irréprochable.', ['Élaboration du rétroplanning et conducteur minuté', 'Coordination complète le jour J (1 chef de projet)', 'Sélection et briefing de 3 prestataires clés', 'Gestion logistique accueil et timing'], ['Hôtesse d’accueil supplémentaire', 'Photobooth élégant', 'Invitations numériques'], 18000, 1],
        ['pack-premium', 'PACK PREMIUM', 'Direction artistique, décoration & prestataires sélectionnés', 'Notre formule signature pour les mariages, lancements de marque et séminaires exigeant un accompagnement complet.', ['Conception créative et planche d’ambiance dédiée', 'Décoration florale et art de la table personnalisés', 'Sonorisation, éclairage d’ambiance et couverture photo', 'Chef de projet senior + assistant(e) le jour J', 'Gestion contractuelle et budgétaire des prestataires'], ['Vidéaste cinéma + drone', 'Orchestre live ou DJ signature', 'Scénographie entrée VIP'], 48000, 2],
        ['pack-prestige', 'PACK PRESTIGE', 'Production intégrale haute couture & accompagnement dédié', 'L’excellence événementielle sans compromis pour galas, grands mariages et congrès d’envergure à Casablanca.', ['Direction de production intégrale de J-90 à J+7', 'Scénographie architecturale sur mesure et mobilier exclusif', 'Traiteur gastronomique et brigade dédiée', 'Production audiovisuelle complète (photo, film 4K, écrans LED)', 'Équipe de coordination sur site (3 à 5 régisseurs) & conciergerie VIP'], ['Artistes internationaux', 'Chapiteau transparent sur mesure', 'Couverture média & relations presse'], 115000, 3],
        ['pack-sur-mesure', 'PACK SUR MESURE', 'Architecture 100 % personnalisée selon votre cahier des charges', 'Conçu pour les projets uniques, multi-jours ou à fortes exigences techniques et protocolaires.', ['Audit complet du besoin et visite technique de repérage', 'Sélection libre des pôles (décoration, technique, restauration, communication)', 'Budget transparent ventilé poste par poste en MAD', 'Équipe dédiée dimensionnée selon l’ampleur de l’événement'], ['Production multi-sites', 'Régie simultanée', 'Traduction simultanée & équipements spéciaux'], null, 4],
      ];
      await db.batch(
        pkgs.map((p) =>
          db
            .prepare(
              `INSERT INTO service_packages (slug, name, subtitle, description, includedItems, extraOptions, indicativePriceMad, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
            )
            .bind(p[0], p[1], p[2], p[3], JSON.stringify(p[4]), JSON.stringify(p[5]), p[6], p[7])
        )
      );
    }

    const provRow = await db.prepare(`SELECT COUNT(*) as c FROM providers`).first<{ c: number }>();
    if ((provRow?.c ?? 0) === 0) {
      const provs: [string, string, string, string, number, string[], string, string][] = [
        ['Maison Alizes Gastronomie (Démo)', 'Traiteurs', 'Service traiteur gastronomique marocain et fusion méditerranéenne pour réceptions et galas.', 'Casablanca', 420, ['Dîners assis', 'Cocktails VIP', 'Pâtisserie événementielle'], 'Disponible week-ends sur réservation 3 semaines à l’avance', IMG_CATERING],
        ['Atelier Blanc & Or Scénographie (Démo)', 'Décorateurs', 'Création de décors architecturaux, arches florales et art de la table contemporain.', 'Casablanca', 22000, ['Scénographie mariage', 'Décors corporate', 'Location mobilier laiton'], '2 événements max par week-end', IMG_WEDDING],
        ['Studio Lumière Maghreb (Démo)', 'Photographes', 'Collectif de photographes éditoriaux spécialisé en mariages et sommets d’entreprise.', 'Casablanca', 11000, ['Reportage éditorial', 'Portraits corporate', 'Tirages fine art'], 'Calendrier ouvert 2026–2027', IMG_ATELIER],
        ['Horizon Cinéma Productions (Démo)', 'Vidéastes', 'Réalisation de films événementiels 4K, captations multi-caméras et teasers rapides.', 'Rabat / Casablanca', 14000, ['Film mariage cinéma', 'Aftermovie corporate', 'Streaming live'], 'Équipe mobile sur tout le Maroc', IMG_CORP],
        ['SoundWave Régie & DJ (Démo)', 'DJ', 'Ingénierie sonore haut de gamme, éclairage architectural LED et sets DJ sur mesure.', 'Casablanca', 12000, ['DJ set fusion', 'Sonorisation conférence', 'Mise en lumière façade'], 'Matériel propre révisé', IMG_SOUND],
        ['Ensemble Tarab & Jazz (Démo)', 'Musiciens', 'Formation modulable mêlant musique arabo-andalouse, cordes classiques et jazz lounge.', 'Casablanca', 16000, ['Cocktail acoustique', 'Orchestre de gala', 'Accueil VIP'], 'Sur réservation préalable', IMG_HERO],
        ['Palais & Pavillons d’Anfa (Démo)', 'Loueurs de salles', 'Espaces de réception modulables avec jardins, terrasses et capacité jusqu’à 600 convives.', 'Casablanca', 45000, ['Salles de gala', 'Espaces séminaires', 'Terrasse cocktail'], 'Visites sur rendez-vous', IMG_HERO],
        ['Maison Flora Botanique (Démo)', 'Fleuristes', 'Compositions florales sculpturales à partir de fleurs fraîches locales et importées.', 'Casablanca', 8500, ['Centres de table', 'Arches cérémonielles', 'Installations suspendues'], 'Commande confirmée à J-14', IMG_WEDDING],
      ];
      await db.batch(
        provs.map((pr) =>
          db
            .prepare(
              `INSERT INTO providers (businessName, category, description, city, phone, email, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt) VALUES (?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, 'approved', 1, ?)`
            )
            .bind(pr[0], pr[1], pr[2], pr[3], pr[4], JSON.stringify(pr[5]), JSON.stringify([pr[7]]), pr[6], pr[7], now)
        )
      );
    }

    const portRow = await db.prepare(`SELECT COUNT(*) as c FROM portfolio`).first<{ c: number }>();
    if ((portRow?.c ?? 0) === 0) {
      const items: [string, string, string, string, string, string, string, string][] = [
        ['Gala Annuel Atlantique (Projet de démonstration)', 'Galas', '2026-05-14', 'Casablanca', 'Exemple de dîner de gala pour 320 dirigeants avec scénographie dorée, éclairage architectural et orchestre live.', IMG_HERO, 'Une coordination millimétrée et une atmosphère mémorable.', 'Direction Communication (Démonstration)'],
        ['Mariage Blanc & Laiton à Anfa (Projet de démonstration)', 'Mariages', '2026-06-20', 'Casablanca', 'Concept scénographique mêlant zellige traditionnel, orchidées blanches et chandeliers en laiton brossé.', IMG_WEDDING, 'Chaque détail de la table reflétait exactement notre souhait.', 'Couple invité (Démonstration)'],
        ['Sommet Financier Horizon 2026 (Projet de démonstration)', 'Conférences', '2026-04-09', 'Casablanca', 'Production audiovisuelle complète : scène panoramique, sonorisation HF et espace networking VIP.', IMG_CORP, 'Qualité technique irréprochable tout au long des deux journées.', 'Comité d’organisation (Démonstration)'],
        ['Cocktail Gastronomique Maison d’Art (Projet de démonstration)', 'Lancements de produits', '2026-03-22', 'Casablanca', 'Présentation de collection privée avec bar gastronomique sur travertin et ambiance acoustique feutrée.', IMG_CATERING, 'Nos invités ont été séduits par le dressage et la fluidité du service.', 'Responsable Marque (Démonstration)'],
        ['Soirée VIP Courtyard Lights (Projet de démonstration)', 'Soirées VIP', '2026-07-11', 'Casablanca', 'Mise en lumière spectaculaire d’un patio architectural avec DJ set et bar à mixologie.', IMG_SOUND, 'Ambiance électrisante et élégante jusqu’au bout de la nuit.', 'Hôte privé (Démonstration)'],
        ['Séminaire Exécutif Corniche (Projet de démonstration)', 'Séminaires', '2026-02-18', 'Casablanca', 'Journée stratégique de 80 cadres incluant ateliers collaboratifs et déjeuner gastronomique.', IMG_CORP, 'Logistique transparente, nos équipes ont pu rester concentrées sur le contenu.', 'DRH Groupe (Démonstration)'],
      ];
      await db.batch(
        items.map((p) =>
          db
            .prepare(
              `INSERT INTO portfolio (title, eventType, eventDate, city, description, galleryUrls, videoUrl, testimonialQuote, testimonialAuthor, isDemo, createdAt) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 1, ?)`
            )
            .bind(p[0], p[1], p[2], p[3], p[4], JSON.stringify([p[5]]), p[6], p[7], now)
        )
      );
    }

    const revRow = await db.prepare(`SELECT COUNT(*) as c FROM reviews`).first<{ c: number }>();
    if ((revRow?.c ?? 0) === 0) {
      const revs: [string, string, string, number, string][] = [
        ['Salma Benali (Profil démo)', 'Mariée — Réception à Anfa', 'Mariages', 5, 'L’équipe a su traduire nos inspirations en une scénographie blanche et dorée d’une rare élégance, avec un suivi rassurant à chaque étape.'],
        ['Karim El Mansouri (Profil démo)', 'Directeur Marketing — Secteur Financier', 'Conférences', 5, 'De la régie audiovisuelle à l’accueil des intervenants, notre conférence annuelle à Casablanca s’est déroulée sans la moindre fausse note.'],
        ['Nadia Tazi (Profil démo)', 'Organisatrice d’anniversaire privé', 'Soirées privées', 5, 'Réactivité exemplaire, prestataires fiables et gestion rigoureuse du budget en MAD.'],
      ];
      await db.batch(
        revs.map((r) =>
          db
            .prepare(`INSERT INTO reviews (authorName, authorRole, eventType, rating, comment, isDemo, isPublished, createdAt) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`)
            .bind(r[0], r[1], r[2], r[3], r[4], now)
        )
      );
    }

    const newsRow = await db.prepare(`SELECT COUNT(*) as c FROM news_articles`).first<{ c: number }>();
    if ((newsRow?.c ?? 0) === 0) {
      const articles: [string, string, string, string, string, string][] = [
        ['tendances-scenographie-mariage-casablanca', 'Scénographie contemporaine : marier l’artisanat marocain au minimalisme champagne', 'Tendances & Design', 'Comment associer zellige, lin naturel, laiton brossé et compositions florales sculpturales pour une réception intemporelle.', 'La tendance actuelle à Casablanca privilégie la pureté des lignes architecturales réchauffée par des matières nobles : nappages en lin ivoire, bougeoirs élancés en laiton et compositions florales monochromes.', IMG_WEDDING],
        ['organiser-conference-entreprise-reussie', 'Checklist technique : les 7 points clés d’un séminaire ou congrès sans accroc', 'Événements Corporate', 'De l’acoustique de salle au repérage J-1, découvrez la méthode STRONG EVENT PRO pour sécuriser vos prises de parole.', 'Un événement professionnel réussi repose sur une préparation invisible mais rigoureuse : redondance audio, calibrage des écrans, signalétique fluide et timing millimétré.', IMG_CORP],
        ['maitriser-budget-evenementiel-mad', 'Comment structurer et optimiser votre budget événementiel en MAD', 'Conseils Budget', 'Répartition des postes clés, priorisation des choix à fort impact visuel et gestion des acomptes en toute transparence.', 'Allouer intelligemment son budget implique d’identifier les pôles à plus fort impact pour vos invités : l’accueil, l’ambiance lumineuse et la qualité de la restauration.', IMG_ATELIER],
      ];
      await db.batch(
        articles.map((a) =>
          db
            .prepare(`INSERT INTO news_articles (slug, title, category, excerpt, content, imageUrl, publishedAt, isPublished) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
            .bind(a[0], a[1], a[2], a[3], a[4], a[5], now)
        )
      );
    }

    const faqRow = await db.prepare(`SELECT COUNT(*) as c FROM faqs`).first<{ c: number }>();
    if ((faqRow?.c ?? 0) === 0) {
      const faqs: [string, string, number][] = [
        ['Comment fonctionne la validation d’une réservation sur STRONG EVENT PRO ?', 'Toute demande de réservation enregistrée en ligne reste au statut « En attente » jusqu’à ce que notre équipe à Casablanca vérifie les disponibilités des lieux, des prestataires et les conditions logistiques.', 1],
        ['Dans quels délais recevons-nous un devis personnalisé ?', 'Après soumission de votre demande, notre équipe étudie votre projet et vous transmet une proposition chiffrée détaillée en MAD sous 24 à 48 heures ouvrées.', 2],
        ['Intervenez-vous uniquement à Casablanca ?', 'Notre agence est basée à Casablanca et coordonne régulièrement des événements dans toute la région (Bouskoura, Mohammedia, Rabat, Marrakech) sur demande.', 3],
        ['Puis-je suivre l’avancement de mon événement et mes factures en ligne ?', 'Oui. Depuis votre Espace Client sécurisé, vous consultez vos devis, acceptez ou refusez les propositions, suivez les 7 étapes de préparation et téléchargez vos reçus et factures.', 4],
        ['Comment les prestataires peuvent-ils rejoindre le réseau ?', 'Les candidatures prestataires sont étudiées et validées par notre administration avant toute publication dans l’annuaire public.', 5],
      ];
      await db.batch(
        faqs.map((f) =>
          db.prepare(`INSERT INTO faqs (question, answer, sortOrder, isPublished) VALUES (?, ?, ?, 1)`).bind(f[0], f[1], f[2])
        )
      );
    }
  })().catch((err) => {
    seededPromise = null;
    throw err;
  });
  return seededPromise;
}

async function getSafeSettings(db: D1Database) {
  const row = (await db.prepare(`SELECT * FROM store_settings WHERE id = 1`).first<Record<string, unknown>>()) || {};
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
    heroImageUrl: String(row.heroImageUrl || IMG_HERO),
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

async function logAdminAction(
  db: D1Database,
  adminUserId: number | null,
  adminName: string,
  action: string,
  targetType: string,
  targetId: string | number = '',
  details = ''
) {
  await db
    .prepare(
      `INSERT INTO admin_audit_logs (adminUserId, adminName, action, targetType, targetId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(adminUserId, adminName, action, targetType, String(targetId), details, new Date().toISOString())
    .run();
}

async function createNotification(db: D1Database, userId: number | null, title: string, message: string) {
  await db
    .prepare(
      `INSERT INTO notifications (userId, channel, title, message, isRead, deliveryStatus, createdAt) VALUES (?, 'in_app', ?, ?, 0, 'Livrée', ?)`
    )
    .bind(userId, title, message, new Date().toISOString())
    .run();
}

async function enforceAdmin(req: Request, env: Env): Promise<{ user: TokenPayload } | { error: Response }> {
  const user = await getAuthUser(req, env);
  if (!user) return { error: json({ error: 'Authentification requise.' }, 401) };
  if (user.role !== 'admin') return { error: json({ error: 'Accès réservé à la direction STRONG EVENT PRO.' }, 403) };
  const row = await env.DB.prepare(`SELECT mustChangePassword FROM users WHERE id = ?`).bind(user.userId).first<{ mustChangePassword: number }>();
  if (!row || row.mustChangePassword === 1) {
    return {
      error: json(
        { error: 'Changement de mot de passe requis lors de la première connexion administrateur.', mustChangePassword: true },
        428
      ),
    };
  }
  return { user };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // Serve uploaded files from R2
    if (pathname.startsWith('/uploads/') && method === 'GET') {
      if (!env.UPLOADS) return new Response('Not found', { status: 404 });
      const key = pathname.replace(/^\/uploads\//, '');
      const obj = await env.UPLOADS.get(key);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, {
        headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream' },
      });
    }

    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    await ensureSeeded(env.DB, env);

    // Health
    if (pathname === '/api/health' && method === 'GET') {
      return json({ status: 'ok', service: 'STRONG EVENT PRO', runtime: 'cloudflare-workers' });
    }

    // Bootstrap
    if (pathname === '/api/bootstrap' && method === 'GET') {
      const settings = await getSafeSettings(env.DB);
      const cats = ((await env.DB.prepare(`SELECT * FROM event_categories ORDER BY id ASC`).all()).results || []).map((c: any) => ({
        ...c,
        includedServices: parseJson(c.includedServices, []),
      }));
      const services = ((await env.DB.prepare(`SELECT * FROM services WHERE isActive = 1 ORDER BY id ASC`).all()).results || []).map((s: any) => ({
        ...s,
        includedItems: parseJson(s.includedItems, []),
        options: parseJson(s.options, []),
        isAvailable: Boolean(s.isAvailable),
        isActive: Boolean(s.isActive),
      }));
      const packages = ((await env.DB.prepare(`SELECT * FROM service_packages WHERE isActive = 1 ORDER BY sortOrder ASC`).all()).results || []).map((p: any) => ({
        ...p,
        includedItems: parseJson(p.includedItems, []),
        extraOptions: parseJson(p.extraOptions, []),
        isActive: Boolean(p.isActive),
      }));
      const providers = ((await env.DB.prepare(`SELECT id, businessName, category, description, city, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt FROM providers WHERE validationStatus = 'approved' ORDER BY id ASC`).all()).results || []).map((pr: any) => ({
        ...pr,
        servicesOffered: parseJson(pr.servicesOffered, []),
        galleryUrls: parseJson(pr.galleryUrls, []),
        isDemo: Boolean(pr.isDemo),
      }));
      const portfolio = ((await env.DB.prepare(`SELECT * FROM portfolio ORDER BY id DESC`).all()).results || []).map((p: any) => ({
        ...p,
        galleryUrls: parseJson(p.galleryUrls, []),
        isDemo: Boolean(p.isDemo),
      }));
      const reviews = ((await env.DB.prepare(`SELECT * FROM reviews WHERE isPublished = 1 ORDER BY id DESC`).all()).results || []).map((r: any) => ({
        ...r,
        isDemo: Boolean(r.isDemo),
        isPublished: Boolean(r.isPublished),
      }));
      const articles = ((await env.DB.prepare(`SELECT * FROM news_articles WHERE isPublished = 1 ORDER BY id DESC`).all()).results || []).map((a: any) => ({
        ...a,
        isPublished: Boolean(a.isPublished),
      }));
      const faqs = ((await env.DB.prepare(`SELECT * FROM faqs WHERE isPublished = 1 ORDER BY sortOrder ASC`).all()).results || []).map((f: any) => ({
        ...f,
        isPublished: Boolean(f.isPublished),
      }));

      return json({ settings, categories: cats, services, packages, providers, portfolio, reviews, articles, faqs });
    }

    if (pathname === '/api/availability' && method === 'GET') {
      const occupied = (await env.DB.prepare(`SELECT eventDate, timeSlot, status FROM bookings WHERE status NOT IN ('Annulée')`).all()).results || [];
      return json({ occupied });
    }

    // Upload to R2
    if (pathname === '/api/upload' && method === 'POST') {
      if (!env.UPLOADS) {
        return json({ error: 'Stockage R2 non configuré sur cet environnement.' }, 503);
      }
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return json({ error: 'Aucun fichier valide reçu.' }, 400);
      }
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
      if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) {
        return json({ error: 'Format non autorisé ou fichier > 5 Mo.' }, 400);
      }
      const key = `${Date.now()}-${toHex(crypto.getRandomValues(new Uint8Array(6)))}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      await env.UPLOADS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
      return json({ url: `/uploads/${key}`, name: file.name }, 201);
    }

    // Auth Register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const b: any = await request.json().catch(() => ({}));
      if (typeof b.fullName !== 'string' || b.fullName.trim().length < 2) return json({ error: 'Le nom complet est requis.' }, 400);
      if (typeof b.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) return json({ error: 'Adresse e-mail invalide.' }, 400);
      if (typeof b.password !== 'string' || b.password.length < 8) return json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400);
      const cleanEmail = b.email.trim().toLowerCase();
      const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(cleanEmail).first();
      if (exists) return json({ error: 'Un compte existe déjà avec cette adresse e-mail.' }, 409);

      const safeRole = b.role === 'provider' ? 'provider' : 'client';
      const now = new Date().toISOString();
      const res = await env.DB.prepare(
        `INSERT INTO users (username, email, fullName, phone, city, company, passwordHash, role, mustChangePassword, createdAt, updatedAt)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
        .bind(cleanEmail, b.fullName.trim(), String(b.phone || '').trim(), String(b.city || 'Casablanca').trim(), String(b.company || '').trim(), await hashPassword(b.password), safeRole, now, now)
        .run();

      const userId = Number(res.meta.last_row_id || 0);
      if (safeRole === 'client') {
        await env.DB.prepare(
          `INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, '', ?)`
        )
          .bind(userId, b.fullName.trim(), cleanEmail, String(b.phone || '').trim(), String(b.company || '').trim(), String(b.city || 'Casablanca').trim(), now)
          .run();
      }

      const token = await signToken({ userId, role: safeRole, email: cleanEmail, fullName: b.fullName.trim() }, env);
      return json(
        {
          token,
          user: {
            id: userId,
            username: null,
            email: cleanEmail,
            fullName: b.fullName.trim(),
            phone: String(b.phone || '').trim(),
            city: String(b.city || 'Casablanca').trim(),
            company: String(b.company || '').trim(),
            role: safeRole,
            mustChangePassword: false,
          },
        },
        201
      );
    }

    // Auth Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const b: any = await request.json().catch(() => ({}));
      if (typeof b.identifier !== 'string' || typeof b.password !== 'string' || !b.identifier.trim() || !b.password) {
        return json({ error: 'Identifiant et mot de passe requis.' }, 400);
      }
      const ident = b.identifier.trim();
      const user = await env.DB.prepare(`SELECT * FROM users WHERE lower(email) = lower(?) OR username = ?`).bind(ident, ident).first<any>();
      if (!user || !(await verifyPassword(b.password, String(user.passwordHash)))) {
        return json({ error: 'Identifiants incorrects.' }, 401);
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
      const token = await signToken({ userId: userObj.id, role: userObj.role, email: userObj.email, fullName: userObj.fullName }, env);
      if (userObj.role === 'admin') {
        await logAdminAction(env.DB, userObj.id, userObj.fullName, 'Connexion administrateur', 'auth', userObj.id);
      }
      return json({ token, user: userObj });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      const user = await env.DB.prepare(`SELECT id, username, email, fullName, phone, city, company, role, mustChangePassword FROM users WHERE id = ?`).bind(auth.userId).first<any>();
      if (!user) return json({ error: 'Compte introuvable.' }, 404);
      return json({ user: { ...user, mustChangePassword: Boolean(user.mustChangePassword) } });
    }

    if (pathname === '/api/auth/change-password' && method === 'POST') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      const b: any = await request.json().catch(() => ({}));
      if (typeof b.currentPassword !== 'string' || typeof b.newPassword !== 'string' || b.newPassword.length < 8) {
        return json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }, 400);
      }
      if (b.newPassword === '123456789') {
        return json({ error: 'Veuillez choisir un mot de passe différent du mot de passe initial.' }, 400);
      }
      const user = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(auth.userId).first<any>();
      if (!user || !(await verifyPassword(b.currentPassword, String(user.passwordHash)))) {
        return json({ error: 'Mot de passe actuel incorrect.' }, 401);
      }
      await env.DB.prepare(`UPDATE users SET passwordHash = ?, mustChangePassword = 0, updatedAt = ? WHERE id = ?`)
        .bind(await hashPassword(b.newPassword), new Date().toISOString(), auth.userId)
        .run();
      if (user.role === 'admin') {
        await logAdminAction(env.DB, auth.userId, String(user.fullName), 'Mot de passe administrateur mis à jour', 'auth', auth.userId);
      }
      return json({ success: true, mustChangePassword: false });
    }

    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const b: any = await request.json().catch(() => ({}));
      if (b.resetToken && b.newPassword) {
        if (typeof b.newPassword !== 'string' || b.newPassword.length < 8) return json({ error: '8 caractères min.' }, 400);
        const user = await env.DB.prepare(`SELECT id, resetTokenExp FROM users WHERE resetToken = ?`).bind(String(b.resetToken)).first<{ id: number; resetTokenExp: number }>();
        if (!user || user.resetTokenExp < Math.floor(Date.now() / 1000)) return json({ error: 'Jeton invalide ou expiré.' }, 400);
        await env.DB.prepare(`UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExp = NULL, updatedAt = ? WHERE id = ?`)
          .bind(await hashPassword(b.newPassword), new Date().toISOString(), user.id)
          .run();
        return json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
      }
      if (typeof b.email !== 'string' || !b.email.trim()) return json({ error: 'Adresse e-mail requise.' }, 400);
      const user = await env.DB.prepare(`SELECT id, role FROM users WHERE lower(email) = lower(?)`).bind(b.email.trim()).first<{ id: number; role: string }>();
      if (!user || user.role === 'admin') {
        return json({ success: true, emailConfigured: false, message: 'Si un compte correspond, la demande est enregistrée.' });
      }
      const token = toHex(crypto.getRandomValues(new Uint8Array(16)));
      const exp = Math.floor(Date.now() / 1000) + 900;
      await env.DB.prepare(`UPDATE users SET resetToken = ?, resetTokenExp = ? WHERE id = ?`).bind(token, exp, user.id).run();
      return json({ success: true, emailConfigured: false, message: 'Utilisez le code temporaire ci-dessous.', localResetCode: token });
    }

    if (pathname === '/api/auth/profile' && method === 'PUT') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      const b: any = await request.json().catch(() => ({}));
      if (typeof b.fullName !== 'string' || b.fullName.trim().length < 2) return json({ error: 'Nom complet requis.' }, 400);
      const now = new Date().toISOString();
      await env.DB.prepare(`UPDATE users SET fullName = ?, phone = ?, city = ?, company = ?, updatedAt = ? WHERE id = ?`)
        .bind(b.fullName.trim(), String(b.phone || ''), String(b.city || 'Casablanca'), String(b.company || ''), now, auth.userId)
        .run();
      await env.DB.prepare(`UPDATE customers SET fullName = ?, phone = ?, city = ?, company = ? WHERE userId = ?`)
        .bind(b.fullName.trim(), String(b.phone || ''), String(b.city || 'Casablanca'), String(b.company || ''), auth.userId)
        .run();
      return json({ success: true });
    }

    // Public Quotes
    if (pathname === '/api/quotes' && method === 'POST') {
      const auth = await getAuthUser(request, env);
      const b: any = await request.json().catch(() => ({}));
      if (!b.eventType || !b.clientName || !b.clientEmail || !b.clientPhone || !b.eventDate) {
        return json({ error: 'Champs obligatoires manquants.' }, 400);
      }
      const now = new Date().toISOString();
      const reference = generateRef('SEP-DEV');
      const cleanEmail = String(b.clientEmail).trim().toLowerCase();
      let customer = await env.DB.prepare(`SELECT id, userId FROM customers WHERE lower(email) = ?`).bind(cleanEmail).first<{ id: number; userId: number | null }>();
      if (!customer) {
        const cr = await env.DB.prepare(
          `INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt) VALUES (?, ?, ?, ?, '', ?, '', ?)`
        )
          .bind(auth?.userId ?? null, String(b.clientName).trim(), cleanEmail, String(b.clientPhone).trim(), String(b.city || 'Casablanca').trim(), now)
          .run();
        customer = { id: Number(cr.meta.last_row_id), userId: auth?.userId ?? null };
      }
      const res = await env.DB.prepare(
        `INSERT INTO quotes (
          reference, customerId, userId, eventType, clientName, clientEmail, clientPhone,
          eventDate, startTime, durationHours, city, venue, guestCount, estimatedBudgetMad,
          selectedServices, styleTheme, projectDescription, specificNeeds, attachmentUrls,
          status, extraFeesMad, discountMad, totalAmountMad, validityDays, adminNotes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Nouvelle demande', 0, 0, 0, 15, '', ?, ?)`
      )
        .bind(
          reference, customer.id, auth?.userId ?? customer.userId ?? null, String(b.eventType).trim(), String(b.clientName).trim(),
          cleanEmail, String(b.clientPhone).trim(), String(b.eventDate).trim(), String(b.startTime || '19:00'), Number(b.durationHours) || 6,
          String(b.city || 'Casablanca'), String(b.venue || ''), Number(b.guestCount) || 50, String(b.estimatedBudgetMad || ''),
          JSON.stringify(Array.isArray(b.selectedServices) ? b.selectedServices : []), String(b.styleTheme || ''), String(b.projectDescription || ''),
          String(b.specificNeeds || ''), JSON.stringify(Array.isArray(b.attachmentUrls) ? b.attachmentUrls : []), now, now
        )
        .run();
      if (auth?.userId || customer.userId) {
        await createNotification(env.DB, auth?.userId ?? customer.userId, 'Demande de devis enregistrée', `Votre demande ${reference} a bien été transmise.`);
      }
      return json({ id: Number(res.meta.last_row_id), reference, status: 'Nouvelle demande' }, 201);
    }

    // Public Bookings
    if (pathname === '/api/bookings' && method === 'POST') {
      const auth = await getAuthUser(request, env);
      const b: any = await request.json().catch(() => ({}));
      if (!b.eventType || !b.eventDate || !b.timeSlot || !b.venue || !b.clientName || !b.clientEmail || !b.clientPhone) {
        return json({ error: 'Tous les champs obligatoires doivent être complétés.' }, 400);
      }
      const conflict = await env.DB.prepare(
        `SELECT id, reference FROM bookings WHERE eventDate = ? AND timeSlot = ? AND status IN ('Confirmée', 'En préparation', 'En cours de réalisation')`
      )
        .bind(String(b.eventDate).trim(), String(b.timeSlot).trim())
        .first<{ id: number; reference: string }>();
      if (conflict) {
        return json({ error: `Créneau déjà réservé et confirmé (${conflict.reference}).` }, 409);
      }
      const now = new Date().toISOString();
      const reference = generateRef('SEP-RES');
      const cleanEmail = String(b.clientEmail).trim().toLowerCase();
      let customer = await env.DB.prepare(`SELECT id, userId FROM customers WHERE lower(email) = ?`).bind(cleanEmail).first<{ id: number; userId: number | null }>();
      if (!customer) {
        const cr = await env.DB.prepare(
          `INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt) VALUES (?, ?, ?, ?, '', ?, '', ?)`
        )
          .bind(auth?.userId ?? null, String(b.clientName).trim(), cleanEmail, String(b.clientPhone).trim(), String(b.city || 'Casablanca').trim(), now)
          .run();
        customer = { id: Number(cr.meta.last_row_id), userId: auth?.userId ?? null };
      }
      const res = await env.DB.prepare(
        `INSERT INTO bookings (
          reference, customerId, userId, clientName, clientEmail, clientPhone,
          eventType, eventDate, timeSlot, venue, city, guestCount,
          selectedServices, selectedPackageId, options, additionalInfo,
          status, assignedManager, internalComments, estimatedTotalMad, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'En attente', '', '', ?, ?, ?)`
      )
        .bind(
          reference, customer.id, auth?.userId ?? customer.userId ?? null, String(b.clientName).trim(), cleanEmail,
          String(b.clientPhone).trim(), String(b.eventType).trim(), String(b.eventDate).trim(), String(b.timeSlot).trim(),
          String(b.venue).trim(), String(b.city || 'Casablanca'), Number(b.guestCount) || 50,
          JSON.stringify(Array.isArray(b.selectedServices) ? b.selectedServices : []), b.selectedPackageId ? Number(b.selectedPackageId) : null,
          JSON.stringify(Array.isArray(b.options) ? b.options : []), String(b.additionalInfo || ''), Number(b.estimatedTotalMad) || 0, now, now
        )
        .run();
      if (auth?.userId || customer.userId) {
        await createNotification(env.DB, auth?.userId ?? customer.userId, 'Demande de réservation reçue', `Demande ${reference} enregistrée en statut « En attente ».`);
      }
      return json({ id: Number(res.meta.last_row_id), reference, status: 'En attente' }, 201);
    }

    if (pathname === '/api/newsletter' && method === 'POST') {
      const b: any = await request.json().catch(() => ({}));
      if (typeof b.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) return json({ error: 'E-mail invalide.' }, 400);
      await env.DB.prepare(`INSERT OR IGNORE INTO newsletter_subscribers (email, createdAt) VALUES (?, ?)`).bind(b.email.trim().toLowerCase(), new Date().toISOString()).run();
      return json({ success: true, message: 'Inscription confirmée.' }, 201);
    }

    if (pathname === '/api/contact' && method === 'POST') {
      const b: any = await request.json().catch(() => ({}));
      if (!b.name || !b.email || !b.subject || !b.message) return json({ error: 'Champs requis.' }, 400);
      await env.DB.prepare(`INSERT INTO contact_messages (name, email, phone, subject, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(String(b.name).trim(), String(b.email).trim(), String(b.phone || ''), String(b.subject).trim(), String(b.message).trim(), new Date().toISOString())
        .run();
      return json({ success: true }, 201);
    }

    if (pathname === '/api/providers/apply' && method === 'POST') {
      const auth = await getAuthUser(request, env);
      const b: any = await request.json().catch(() => ({}));
      if (!b.businessName || !b.category || !b.description || !b.email) return json({ error: 'Champs requis.' }, 400);
      const res = await env.DB.prepare(
        `INSERT INTO providers (userId, businessName, category, description, city, phone, email, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, '', 'pending', 0, ?)`
      )
        .bind(
          auth?.userId ?? null, String(b.businessName).trim(), String(b.category).trim(), String(b.description).trim(),
          String(b.city || 'Casablanca'), String(b.phone || ''), String(b.email).trim(), b.indicativePriceMad ? Number(b.indicativePriceMad) : null,
          JSON.stringify(Array.isArray(b.servicesOffered) ? b.servicesOffered : []), String(b.availabilityNotes || ''), new Date().toISOString()
        )
        .run();
      return json({ id: Number(res.meta.last_row_id), validationStatus: 'pending', message: 'Profil soumis pour validation.' }, 201);
    }

    // Client Dashboard Routes
    if (pathname === '/api/client/dashboard' && method === 'GET') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      const email = auth.email.toLowerCase();
      const cust = await env.DB.prepare(`SELECT id FROM customers WHERE userId = ? OR lower(email) = ?`).bind(auth.userId, email).first<{ id: number }>();
      const customerId = cust?.id ?? -1;

      const rawQuotes = (await env.DB.prepare(`SELECT * FROM quotes WHERE userId = ? OR customerId = ? OR lower(clientEmail) = ? ORDER BY id DESC`).bind(auth.userId, customerId, email).all()).results || [];
      const quotes = await Promise.all(
        rawQuotes.map(async (q: any) => ({
          ...q,
          selectedServices: parseJson(q.selectedServices, []),
          attachmentUrls: parseJson(q.attachmentUrls, []),
          items: (await env.DB.prepare(`SELECT * FROM quote_items WHERE quoteId = ?`).bind(q.id).all()).results || [],
        }))
      );
      const bookings = ((await env.DB.prepare(`SELECT * FROM bookings WHERE userId = ? OR customerId = ? OR lower(clientEmail) = ? ORDER BY id DESC`).bind(auth.userId, customerId, email).all()).results || []).map((bk: any) => ({
        ...bk,
        selectedServices: parseJson(bk.selectedServices, []),
        options: parseJson(bk.options, []),
      }));
      const rawEvents = (await env.DB.prepare(`SELECT * FROM events WHERE customerId = ? ORDER BY id DESC`).bind(customerId).all()).results || [];
      const events = await Promise.all(
        rawEvents.map(async (ev: any) => ({
          ...ev,
          documents: parseJson(ev.documents, []),
          tasks: ((await env.DB.prepare(`SELECT * FROM tasks WHERE eventId = ? ORDER BY stage ASC, id ASC`).bind(ev.id).all()).results || []).map((t: any) => ({
            ...t,
            isDone: Boolean(t.isDone),
          })),
        }))
      );
      const invoices = (await env.DB.prepare(`SELECT * FROM invoices WHERE customerId = ? ORDER BY id DESC`).bind(customerId).all()).results || [];
      const payments = (await env.DB.prepare(`SELECT * FROM payments WHERE customerId = ? ORDER BY id DESC`).bind(customerId).all()).results || [];
      const notifications = ((await env.DB.prepare(`SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC LIMIT 30`).bind(auth.userId).all()).results || []).map((n: any) => ({ ...n, isRead: Boolean(n.isRead) }));
      const messages = ((await env.DB.prepare(`SELECT * FROM messages WHERE userId = ? ORDER BY id ASC`).bind(auth.userId).all()).results || []).map((m: any) => ({ ...m, isRead: Boolean(m.isRead) }));

      return json({ quotes, bookings, events, invoices, payments, notifications, messages });
    }

    const quoteRespondMatch = pathname.match(/^\/api\/client\/quotes\/(\d+)\/respond$/);
    if (quoteRespondMatch && method === 'POST') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      const quoteId = Number(quoteRespondMatch[1]);
      const b: any = await request.json().catch(() => ({}));
      if (b.decision !== 'Accepté' && b.decision !== 'Refusé') return json({ error: 'Décision invalide.' }, 400);
      const quote = await env.DB.prepare(`SELECT * FROM quotes WHERE id = ? AND (userId = ? OR lower(clientEmail) = ?)`).bind(quoteId, auth.userId, auth.email.toLowerCase()).first<any>();
      if (!quote) return json({ error: 'Devis introuvable.' }, 404);
      const now = new Date().toISOString();
      await env.DB.prepare(`UPDATE quotes SET status = ?, updatedAt = ? WHERE id = ?`).bind(b.decision, now, quoteId).run();
      if (b.decision === 'Accepté') {
        const exInv = await env.DB.prepare(`SELECT id FROM invoices WHERE quoteId = ?`).bind(quoteId).first();
        if (!exInv && Number(quote.totalAmountMad) > 0) {
          await env.DB.prepare(`INSERT INTO invoices (invoiceNumber, quoteId, eventId, customerId, totalMad, paidMad, remainingMad, status, issuedAt) VALUES (?, ?, NULL, ?, ?, 0, ?, 'Émise', ?)`)
            .bind(generateRef('FAC'), quoteId, quote.customerId || null, Number(quote.totalAmountMad), Number(quote.totalAmountMad), now)
            .run();
        }
        await createNotification(env.DB, auth.userId, 'Devis accepté', `Vous avez accepté le devis ${String(quote.reference)}.`);
      }
      return json({ success: true, status: b.decision });
    }

    if (pathname === '/api/client/messages' && method === 'POST') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      const b: any = await request.json().catch(() => ({}));
      if (!b.subject || !b.body) return json({ error: 'Objet et message requis.' }, 400);
      const res = await env.DB.prepare(`INSERT INTO messages (userId, senderRole, senderName, subject, body, isRead, createdAt) VALUES (?, 'client', ?, ?, ?, 0, ?)`)
        .bind(auth.userId, auth.fullName, String(b.subject).trim(), String(b.body).trim(), new Date().toISOString())
        .run();
      return json({ id: Number(res.meta.last_row_id) }, 201);
    }

    if (pathname === '/api/client/notifications/read' && method === 'POST') {
      const auth = await getAuthUser(request, env);
      if (!auth) return json({ error: 'Authentification requise.' }, 401);
      await env.DB.prepare(`UPDATE notifications SET isRead = 1 WHERE userId = ?`).bind(auth.userId).run();
      return json({ success: true });
    }

    // Admin Routes
    if (pathname.startsWith('/api/admin/')) {
      const gate = await enforceAdmin(request, env);
      if ('error' in gate) return gate.error;
      const admin = gate.user;

      if (pathname === '/api/admin/overview' && method === 'GET') {
        const count = async (sql: string) => ((await env.DB.prepare(sql).first<{ c: number }>())?.c ?? 0);
        const confirmedPayAgg = (await env.DB.prepare(`SELECT COALESCE(SUM(amountMad), 0) as total, COUNT(*) as cnt FROM payments WHERE status = 'Confirmé'`).first<{ total: number; cnt: number }>()) || { total: 0, cnt: 0 };
        const pendingPayAgg = (await env.DB.prepare(`SELECT COALESCE(SUM(remainingMad), 0) as total FROM invoices WHERE remainingMad > 0`).first<{ total: number }>()) || { total: 0 };

        return json({
          totalQuotes: await count(`SELECT COUNT(*) as c FROM quotes`),
          pendingQuotes: await count(`SELECT COUNT(*) as c FROM quotes WHERE status IN ('Nouvelle demande', 'En cours d''étude', 'En attente de validation')`),
          totalBookings: await count(`SELECT COUNT(*) as c FROM bookings`),
          pendingBookings: await count(`SELECT COUNT(*) as c FROM bookings WHERE status IN ('En attente', 'En cours de confirmation')`),
          confirmedBookings: await count(`SELECT COUNT(*) as c FROM bookings WHERE status IN ('Confirmée', 'En préparation', 'En cours de réalisation')`),
          upcomingEvents: await count(`SELECT COUNT(*) as c FROM events WHERE status != 'Terminé' AND status != 'Clôturé'`),
          completedEvents: await count(`SELECT COUNT(*) as c FROM events WHERE status IN ('Terminé', 'Clôturé')`),
          totalCustomers: await count(`SELECT COUNT(*) as c FROM customers`),
          totalProviders: await count(`SELECT COUNT(*) as c FROM providers`),
          approvedProviders: await count(`SELECT COUNT(*) as c FROM providers WHERE validationStatus = 'approved'`),
          confirmedRevenueMad: confirmedPayAgg.total,
          receivedPaymentsCount: confirmedPayAgg.cnt,
          pendingPaymentsMad: pendingPayAgg.total,
          bookingsByMonth: (await env.DB.prepare(`SELECT substr(eventDate, 1, 7) as month, COUNT(*) as count FROM bookings GROUP BY substr(eventDate, 1, 7) ORDER BY month ASC LIMIT 12`).all()).results || [],
          revenueByMonth: (await env.DB.prepare(`SELECT substr(createdAt, 1, 7) as month, COALESCE(SUM(amountMad), 0) as amountMad FROM payments WHERE status = 'Confirmé' GROUP BY substr(createdAt, 1, 7) ORDER BY month ASC LIMIT 12`).all()).results || [],
          recentActivities: (await env.DB.prepare(`SELECT id, adminName, action, targetType, details, createdAt FROM admin_audit_logs ORDER BY id DESC LIMIT 12`).all()).results || [],
        });
      }

      if (pathname === '/api/admin/bookings' && method === 'GET') {
        const rows = ((await env.DB.prepare(`SELECT * FROM bookings ORDER BY id DESC`).all()).results || []).map((bk: any) => ({
          ...bk,
          selectedServices: parseJson(bk.selectedServices, []),
          options: parseJson(bk.options, []),
        }));
        return json({ bookings: rows });
      }

      const bkMatch = pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
      if (bkMatch && method === 'PUT') {
        const id = Number(bkMatch[1]);
        const existing = await env.DB.prepare(`SELECT * FROM bookings WHERE id = ?`).bind(id).first<any>();
        if (!existing) return json({ error: 'Réservation introuvable.' }, 404);
        const b: any = await request.json().catch(() => ({}));
        const nextStatus = String(b.status || existing.status);
        const now = new Date().toISOString();
        await env.DB.prepare(`UPDATE bookings SET status = ?, assignedManager = ?, internalComments = ?, estimatedTotalMad = ?, updatedAt = ? WHERE id = ?`)
          .bind(nextStatus, b.assignedManager ?? existing.assignedManager, b.internalComments ?? existing.internalComments, b.estimatedTotalMad ?? existing.estimatedTotalMad, now, id)
          .run();
        if (nextStatus === 'Confirmée') {
          const hasEv = await env.DB.prepare(`SELECT id FROM events WHERE bookingId = ?`).bind(id).first();
          if (!hasEv) {
            await env.DB.prepare(`INSERT INTO events (bookingId, quoteId, customerId, title, eventType, eventDate, venue, city, budgetMad, projectManager, currentStage, status, documents, createdAt) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'En préparation', '[]', ?)`)
              .bind(id, existing.customerId || null, `${existing.eventType} — ${existing.clientName}`, existing.eventType, existing.eventDate, existing.venue, existing.city, Number(b.estimatedTotalMad ?? existing.estimatedTotalMad ?? 0), String(b.assignedManager ?? existing.assignedManager ?? 'Direction STRONG EVENT PRO'), now)
              .run();
          }
        }
        if (existing.userId) {
          await createNotification(env.DB, Number(existing.userId), `Mise à jour réservation ${existing.reference}`, `Nouveau statut : ${nextStatus}.`);
        }
        await logAdminAction(env.DB, admin.userId, admin.fullName, `Réservation passée à "${nextStatus}"`, 'booking', id, String(existing.reference));
        return json({ success: true });
      }

      if (pathname === '/api/admin/quotes' && method === 'GET') {
        const raw = (await env.DB.prepare(`SELECT * FROM quotes ORDER BY id DESC`).all()).results || [];
        const quotes = await Promise.all(
          raw.map(async (q: any) => ({
            ...q,
            selectedServices: parseJson(q.selectedServices, []),
            attachmentUrls: parseJson(q.attachmentUrls, []),
            items: (await env.DB.prepare(`SELECT * FROM quote_items WHERE quoteId = ?`).bind(q.id).all()).results || [],
          }))
        );
        return json({ quotes });
      }

      const qtMatch = pathname.match(/^\/api\/admin\/quotes\/(\d+)$/);
      if (qtMatch && method === 'PUT') {
        const id = Number(qtMatch[1]);
        const existing = await env.DB.prepare(`SELECT * FROM quotes WHERE id = ?`).bind(id).first<any>();
        if (!existing) return json({ error: 'Devis introuvable.' }, 404);
        const b: any = await request.json().catch(() => ({}));
        let subtotal = 0;
        await env.DB.prepare(`DELETE FROM quote_items WHERE quoteId = ?`).bind(id).run();
        if (Array.isArray(b.items)) {
          for (const it of b.items) {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const unit = Math.max(0, Number(it.unitPriceMad) || 0);
            const lineTotal = qty * unit;
            subtotal += lineTotal;
            await env.DB.prepare(`INSERT INTO quote_items (quoteId, serviceName, description, quantity, unitPriceMad, totalPriceMad) VALUES (?, ?, ?, ?, ?, ?)`)
              .bind(id, String(it.serviceName || 'Prestation'), String(it.description || ''), qty, unit, lineTotal)
              .run();
          }
        }
        const totalAmountMad = Math.max(0, subtotal + (Number(b.extraFeesMad) || 0) - (Number(b.discountMad) || 0));
        const nextStatus = String(b.status || existing.status);
        await env.DB.prepare(`UPDATE quotes SET status = ?, extraFeesMad = ?, discountMad = ?, totalAmountMad = ?, validityDays = ?, adminNotes = ?, updatedAt = ? WHERE id = ?`)
          .bind(nextStatus, Number(b.extraFeesMad) || 0, Number(b.discountMad) || 0, totalAmountMad, Number(b.validityDays) || 15, String(b.adminNotes || ''), new Date().toISOString(), id)
          .run();
        if (nextStatus === 'Devis envoyé' && existing.userId) {
          await createNotification(
            env.DB,
            Number(existing.userId),
            `Devis ${String(existing.reference)} disponible`,
            `Votre devis détaillé d’un montant de ${totalAmountMad.toLocaleString('fr-FR')} MAD est prêt dans votre espace client.`
          );
        }
        await logAdminAction(env.DB, admin.userId, admin.fullName, `Mise à jour devis (${nextStatus})`, 'quote', id, `${existing.reference} — ${totalAmountMad} MAD`);
        return json({ success: true, totalAmountMad });
      }

      if (pathname === '/api/admin/events' && method === 'GET') {
        const raw = (await env.DB.prepare(`SELECT e.*, c.fullName as clientName FROM events e LEFT JOIN customers c ON c.id = e.customerId ORDER BY e.eventDate ASC`).all()).results || [];
        const events = await Promise.all(
          raw.map(async (ev: any) => ({
            ...ev,
            documents: parseJson(ev.documents, []),
            tasks: ((await env.DB.prepare(`SELECT * FROM tasks WHERE eventId = ? ORDER BY stage ASC, id ASC`).bind(ev.id).all()).results || []).map((t: any) => ({ ...t, isDone: Boolean(t.isDone) })),
            assignments: (await env.DB.prepare(`SELECT ea.*, p.businessName, p.category FROM event_assignments ea LEFT JOIN providers p ON p.id = ea.providerId WHERE ea.eventId = ?`).bind(ev.id).all()).results || [],
          }))
        );
        return json({ events });
      }

      if (pathname === '/api/admin/events' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.title || !b.eventType || !b.eventDate || !b.venue) return json({ error: 'Champs requis.' }, 400);
        const res = await env.DB.prepare(`INSERT INTO events (bookingId, quoteId, customerId, title, eventType, eventDate, venue, city, budgetMad, projectManager, currentStage, status, documents, createdAt) VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(b.customerId ? Number(b.customerId) : null, b.title, b.eventType, b.eventDate, b.venue, b.city || 'Casablanca', Number(b.budgetMad) || 0, b.projectManager || 'Direction', Number(b.currentStage) || 1, b.status || 'En préparation', JSON.stringify(Array.isArray(b.documents) ? b.documents : []), new Date().toISOString())
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const evMatch = pathname.match(/^\/api\/admin\/events\/(\d+)$/);
      if (evMatch && method === 'PUT') {
        const id = Number(evMatch[1]);
        const ex = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(id).first<any>();
        if (!ex) return json({ error: 'Introuvable.' }, 404);
        const b: any = await request.json().catch(() => ({}));
        await env.DB.prepare(`UPDATE events SET title = ?, eventType = ?, eventDate = ?, venue = ?, city = ?, budgetMad = ?, projectManager = ?, currentStage = ?, status = ?, documents = ? WHERE id = ?`)
          .bind(b.title ?? ex.title, b.eventType ?? ex.eventType, b.eventDate ?? ex.eventDate, b.venue ?? ex.venue, b.city ?? ex.city, b.budgetMad ?? ex.budgetMad, b.projectManager ?? ex.projectManager, b.currentStage ?? ex.currentStage, b.status ?? ex.status, b.documents !== undefined ? JSON.stringify(b.documents) : ex.documents, id)
          .run();
        return json({ success: true });
      }
      if (evMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(Number(evMatch[1])).run();
        return json({ success: true });
      }

      const evTasksMatch = pathname.match(/^\/api\/admin\/events\/(\d+)\/tasks$/);
      if (evTasksMatch && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.title) return json({ error: 'Titre requis.' }, 400);
        const res = await env.DB.prepare(`INSERT INTO tasks (eventId, title, dueDate, assignee, isDone, stage, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?)`)
          .bind(Number(evTasksMatch[1]), String(b.title), String(b.dueDate || ''), String(b.assignee || ''), Number(b.stage) || 1, new Date().toISOString())
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const taskMatch = pathname.match(/^\/api\/admin\/tasks\/(\d+)$/);
      if (taskMatch && method === 'PUT') {
        const b: any = await request.json().catch(() => ({}));
        await env.DB.prepare(`UPDATE tasks SET isDone = ? WHERE id = ?`).bind(b.isDone ? 1 : 0, Number(taskMatch[1])).run();
        return json({ success: true });
      }
      if (taskMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM tasks WHERE id = ?`).bind(Number(taskMatch[1])).run();
        return json({ success: true });
      }

      const evAssignMatch = pathname.match(/^\/api\/admin\/events\/(\d+)\/assignments$/);
      if (evAssignMatch && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.providerId || !b.roleLabel) return json({ error: 'Prestataire et rôle requis.' }, 400);
        const res = await env.DB.prepare(
          `INSERT INTO event_assignments (eventId, providerId, roleLabel, agreedFeeMad, status, createdAt) VALUES (?, ?, ?, ?, 'Assigné', ?)`
        )
          .bind(Number(evAssignMatch[1]), Number(b.providerId), String(b.roleLabel), Number(b.agreedFeeMad) || 0, new Date().toISOString())
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const assignDelMatch = pathname.match(/^\/api\/admin\/assignments\/(\d+)$/);
      if (assignDelMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM event_assignments WHERE id = ?`).bind(Number(assignDelMatch[1])).run();
        return json({ success: true });
      }

      if (pathname === '/api/admin/services' && method === 'GET') {
        const services = ((await env.DB.prepare(`SELECT * FROM services ORDER BY id ASC`).all()).results || []).map((s: any) => ({
          ...s, includedItems: parseJson(s.includedItems, []), options: parseJson(s.options, []), isAvailable: Boolean(s.isAvailable), isActive: Boolean(s.isActive),
        }));
        const packages = ((await env.DB.prepare(`SELECT * FROM service_packages ORDER BY sortOrder ASC`).all()).results || []).map((p: any) => ({
          ...p, includedItems: parseJson(p.includedItems, []), extraOptions: parseJson(p.extraOptions, []), isActive: Boolean(p.isActive),
        }));
        return json({ services, packages });
      }

      if (pathname === '/api/admin/services' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.name || !b.category || !b.description) return json({ error: 'Champs requis.' }, 400);
        const slug = `${String(b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now() % 1000}`;
        const res = await env.DB.prepare(`INSERT INTO services (slug, category, name, description, includedItems, indicativePriceMad, priceLabel, duration, conditions, isAvailable, isActive, imageUrl, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(slug, b.category, b.name, b.description, JSON.stringify(b.includedItems || []), b.indicativePriceMad ? Number(b.indicativePriceMad) : null, b.priceLabel || 'Sur devis', b.duration || 'Sur mesure', b.conditions || '', b.isAvailable === false ? 0 : 1, b.isActive === false ? 0 : 1, b.imageUrl || IMG_WEDDING, JSON.stringify(b.options || []))
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const srvMatch = pathname.match(/^\/api\/admin\/services\/(\d+)$/);
      if (srvMatch && method === 'PUT') {
        const id = Number(srvMatch[1]);
        const ex = await env.DB.prepare(`SELECT * FROM services WHERE id = ?`).bind(id).first<any>();
        if (!ex) return json({ error: 'Introuvable.' }, 404);
        const b: any = await request.json().catch(() => ({}));
        await env.DB.prepare(`UPDATE services SET category = ?, name = ?, description = ?, includedItems = ?, indicativePriceMad = ?, priceLabel = ?, duration = ?, conditions = ?, isAvailable = ?, isActive = ?, imageUrl = ?, options = ? WHERE id = ?`)
          .bind(b.category ?? ex.category, b.name ?? ex.name, b.description ?? ex.description, b.includedItems ? JSON.stringify(b.includedItems) : ex.includedItems, b.indicativePriceMad !== undefined ? (b.indicativePriceMad ? Number(b.indicativePriceMad) : null) : ex.indicativePriceMad, b.priceLabel ?? ex.priceLabel, b.duration ?? ex.duration, b.conditions ?? ex.conditions, b.isAvailable !== undefined ? (b.isAvailable ? 1 : 0) : ex.isAvailable, b.isActive !== undefined ? (b.isActive ? 1 : 0) : ex.isActive, b.imageUrl ?? ex.imageUrl, b.options ? JSON.stringify(b.options) : ex.options, id)
          .run();
        return json({ success: true });
      }
      if (srvMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM services WHERE id = ?`).bind(Number(srvMatch[1])).run();
        return json({ success: true });
      }

      const pkgMatch = pathname.match(/^\/api\/admin\/packages\/(\d+)$/);
      if (pkgMatch && method === 'PUT') {
        const id = Number(pkgMatch[1]);
        const ex = await env.DB.prepare(`SELECT * FROM service_packages WHERE id = ?`).bind(id).first<any>();
        if (!ex) return json({ error: 'Formule introuvable.' }, 404);
        const b: any = await request.json().catch(() => ({}));
        await env.DB.prepare(`UPDATE service_packages SET name = ?, subtitle = ?, description = ?, indicativePriceMad = ?, isActive = ? WHERE id = ?`)
          .bind(
            b.name ?? ex.name,
            b.subtitle ?? ex.subtitle,
            b.description ?? ex.description,
            b.indicativePriceMad !== undefined ? (b.indicativePriceMad ? Number(b.indicativePriceMad) : null) : ex.indicativePriceMad,
            b.isActive !== undefined ? (b.isActive ? 1 : 0) : ex.isActive,
            id
          )
          .run();
        await logAdminAction(env.DB, admin.userId, admin.fullName, 'Modification formule', 'package', id);
        return json({ success: true });
      }

      if (pathname === '/api/admin/providers' && method === 'GET') {
        const providers = ((await env.DB.prepare(`SELECT * FROM providers ORDER BY id DESC`).all()).results || []).map((p: any) => ({
          ...p, servicesOffered: parseJson(p.servicesOffered, []), galleryUrls: parseJson(p.galleryUrls, []), isDemo: Boolean(p.isDemo),
        }));
        return json({ providers });
      }

      if (pathname === '/api/admin/providers' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.businessName || !b.category || !b.description) return json({ error: 'Nom commercial, catégorie et description requis.' }, 400);
        const res = await env.DB.prepare(
          `INSERT INTO providers (userId, businessName, category, description, city, phone, email, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt)
           VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        )
          .bind(
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
            String(b.imageUrl || IMG_ATELIER),
            String(b.validationStatus || 'approved'),
            new Date().toISOString()
          )
          .run();
        await logAdminAction(env.DB, admin.userId, admin.fullName, 'Ajout prestataire', 'provider', Number(res.meta.last_row_id), String(b.businessName));
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const provMatch = pathname.match(/^\/api\/admin\/providers\/(\d+)$/);
      if (provMatch && method === 'PUT') {
        const id = Number(provMatch[1]);
        const ex = await env.DB.prepare(`SELECT * FROM providers WHERE id = ?`).bind(id).first<any>();
        if (!ex) return json({ error: 'Introuvable.' }, 404);
        const b: any = await request.json().catch(() => ({}));
        await env.DB.prepare(`UPDATE providers SET businessName = ?, category = ?, description = ?, city = ?, phone = ?, email = ?, indicativePriceMad = ?, availabilityNotes = ?, validationStatus = ? WHERE id = ?`)
          .bind(b.businessName ?? ex.businessName, b.category ?? ex.category, b.description ?? ex.description, b.city ?? ex.city, b.phone ?? ex.phone, b.email ?? ex.email, b.indicativePriceMad !== undefined ? (b.indicativePriceMad ? Number(b.indicativePriceMad) : null) : ex.indicativePriceMad, b.availabilityNotes ?? ex.availabilityNotes, b.validationStatus ?? ex.validationStatus, id)
          .run();
        return json({ success: true });
      }
      if (provMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM providers WHERE id = ?`).bind(Number(provMatch[1])).run();
        return json({ success: true });
      }

      if (pathname === '/api/admin/customers' && method === 'GET') {
        const customers = (await env.DB.prepare(`SELECT * FROM customers ORDER BY id DESC`).all()).results || [];
        const enriched = await Promise.all(
          customers.map(async (c: any) => ({
            ...c,
            quotesCount: (await env.DB.prepare(`SELECT COUNT(*) as cnt FROM quotes WHERE customerId = ?`).bind(c.id).first<{ cnt: number }>())?.cnt ?? 0,
            bookingsCount: (await env.DB.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE customerId = ?`).bind(c.id).first<{ cnt: number }>())?.cnt ?? 0,
            eventsCount: (await env.DB.prepare(`SELECT COUNT(*) as cnt FROM events WHERE customerId = ?`).bind(c.id).first<{ cnt: number }>())?.cnt ?? 0,
          }))
        );
        return json({ customers: enriched });
      }

      const custMatch = pathname.match(/^\/api\/admin\/customers\/(\d+)$/);
      if (custMatch && method === 'PUT') {
        const id = Number(custMatch[1]);
        const b: any = await request.json().catch(() => ({}));
        await env.DB.prepare(`UPDATE customers SET fullName = ?, phone = ?, company = ?, city = ?, notes = ? WHERE id = ?`)
          .bind(
            String(b.fullName || ''),
            String(b.phone || ''),
            String(b.company || ''),
            String(b.city || 'Casablanca'),
            String(b.notes || ''),
            id
          )
          .run();
        await logAdminAction(env.DB, admin.userId, admin.fullName, 'Modification fiche client', 'customer', id);
        return json({ success: true });
      }

      if (pathname === '/api/admin/portfolio' && method === 'GET') {
        const portfolio = ((await env.DB.prepare(`SELECT * FROM portfolio ORDER BY id DESC`).all()).results || []).map((p: any) => ({
          ...p, galleryUrls: parseJson(p.galleryUrls, []), isDemo: Boolean(p.isDemo),
        }));
        return json({ portfolio });
      }
      if (pathname === '/api/admin/portfolio' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.title || !b.eventType || !b.description) return json({ error: 'Champs requis.' }, 400);
        const res = await env.DB.prepare(`INSERT INTO portfolio (title, eventType, eventDate, city, description, galleryUrls, videoUrl, testimonialQuote, testimonialAuthor, isDemo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(b.title, b.eventType, b.eventDate || new Date().toISOString().slice(0, 10), b.city || 'Casablanca', b.description, JSON.stringify(Array.isArray(b.galleryUrls) && b.galleryUrls.length ? b.galleryUrls : [IMG_HERO]), b.videoUrl || '', b.testimonialQuote || '', b.testimonialAuthor || '', b.isDemo ? 1 : 0, new Date().toISOString())
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }
      const portDelMatch = pathname.match(/^\/api\/admin\/portfolio\/(\d+)$/);
      if (portDelMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM portfolio WHERE id = ?`).bind(Number(portDelMatch[1])).run();
        return json({ success: true });
      }

      if (pathname === '/api/admin/payments' && method === 'GET') {
        const payments = (await env.DB.prepare(`SELECT p.*, c.fullName as clientName FROM payments p LEFT JOIN customers c ON c.id = p.customerId ORDER BY p.id DESC`).all()).results || [];
        const invoices = (await env.DB.prepare(`SELECT i.*, c.fullName as clientName FROM invoices i LEFT JOIN customers c ON c.id = i.customerId ORDER BY i.id DESC`).all()).results || [];
        return json({ payments, invoices });
      }
      if (pathname === '/api/admin/payments' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        const amountMad = Number(b.amountMad);
        if (!amountMad || amountMad <= 0) return json({ error: 'Montant invalide.' }, 400);
        const now = new Date().toISOString();
        const reference = generateRef('PAY');
        const status = b.status === 'Confirmé' ? 'Confirmé' : 'En attente';
        const res = await env.DB.prepare(`INSERT INTO payments (reference, eventId, bookingId, quoteId, customerId, paymentType, amountMad, method, status, confirmedBy, paidAt, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(reference, b.eventId ? Number(b.eventId) : null, b.bookingId ? Number(b.bookingId) : null, b.quoteId ? Number(b.quoteId) : null, b.customerId ? Number(b.customerId) : null, ['Acompte', 'Complément', 'Solde'].includes(b.paymentType) ? b.paymentType : 'Acompte', amountMad, b.method || 'Virement bancaire', status, status === 'Confirmé' ? admin.fullName : '', status === 'Confirmé' ? now : '', b.notes || '', now)
          .run();
        if (status === 'Confirmé' && (b.invoiceId || b.quoteId || b.eventId)) {
          const inv = await env.DB.prepare(`SELECT * FROM invoices WHERE id = ? OR quoteId = ? OR eventId = ? LIMIT 1`)
            .bind(Number(b.invoiceId || 0), Number(b.quoteId || 0), Number(b.eventId || 0))
            .first<any>();
          if (inv) {
            const nextPaid = Number(inv.paidMad) + amountMad;
            const nextRem = Math.max(0, Number(inv.totalMad) - nextPaid);
            await env.DB.prepare(`UPDATE invoices SET paidMad = ?, remainingMad = ?, status = ? WHERE id = ?`)
              .bind(nextPaid, nextRem, nextRem === 0 ? 'Soldée' : 'Partiellement réglée', inv.id)
              .run();
          }
        }
        await logAdminAction(env.DB, admin.userId, admin.fullName, `Enregistrement paiement (${status})`, 'payment', Number(res.meta.last_row_id), `${amountMad} MAD`);
        return json({ id: Number(res.meta.last_row_id), reference, status }, 201);
      }
      const payConfirmMatch = pathname.match(/^\/api\/admin\/payments\/(\d+)\/confirm$/);
      if (payConfirmMatch && method === 'PUT') {
        const id = Number(payConfirmMatch[1]);
        const pay = await env.DB.prepare(`SELECT * FROM payments WHERE id = ?`).bind(id).first<any>();
        if (!pay) return json({ error: 'Introuvable.' }, 404);
        if (pay.status !== 'Confirmé') {
          await env.DB.prepare(`UPDATE payments SET status = 'Confirmé', confirmedBy = ?, paidAt = ? WHERE id = ?`).bind(admin.fullName, new Date().toISOString(), id).run();
          const inv = await env.DB.prepare(`SELECT * FROM invoices WHERE quoteId = ? OR eventId = ? OR customerId = ? LIMIT 1`).bind(Number(pay.quoteId || 0), Number(pay.eventId || 0), Number(pay.customerId || 0)).first<any>();
          if (inv) {
            const nextPaid = Number(inv.paidMad) + Number(pay.amountMad);
            const nextRem = Math.max(0, Number(inv.totalMad) - nextPaid);
            await env.DB.prepare(`UPDATE invoices SET paidMad = ?, remainingMad = ?, status = ? WHERE id = ?`).bind(nextPaid, nextRem, nextRem === 0 ? 'Soldée' : 'Partiellement réglée', inv.id).run();
          }
        }
        return json({ success: true });
      }

      if (pathname === '/api/admin/content' && method === 'GET') {
        return json({
          settings: await getSafeSettings(env.DB),
          articles: (await env.DB.prepare(`SELECT * FROM news_articles ORDER BY id DESC`).all()).results || [],
          faqs: (await env.DB.prepare(`SELECT * FROM faqs ORDER BY sortOrder ASC`).all()).results || [],
          contacts: (await env.DB.prepare(`SELECT * FROM contact_messages ORDER BY id DESC LIMIT 50`).all()).results || [],
          newsletter: (await env.DB.prepare(`SELECT * FROM newsletter_subscribers ORDER BY id DESC`).all()).results || [],
          messages: (await env.DB.prepare(`SELECT * FROM messages ORDER BY id DESC LIMIT 50`).all()).results || [],
        });
      }

      if (pathname === '/api/admin/settings' && method === 'PUT') {
        const b: any = await request.json().catch(() => ({}));
        const curr = await getSafeSettings(env.DB);
        await env.DB.prepare(
          `UPDATE store_settings SET address = ?, phone = ?, whatsappNumber = ?, email = ?, openingHours = ?, googleMapsEmbedUrl = ?, googleMapsLink = ?, heroTitle = ?, heroSubtitle = ?, aboutText = ?, socialLinks = ?, emailNotificationsEnabled = ?, whatsappNotificationsEnabled = ?, legalMentions = ?, privacyPolicy = ?, termsOfSale = ? WHERE id = 1`
        )
          .bind(
            b.address ?? curr.address, b.phone ?? curr.phone, b.whatsappNumber ?? curr.whatsappNumber, b.email ?? curr.email,
            b.openingHours ?? curr.openingHours, b.googleMapsEmbedUrl ?? curr.googleMapsEmbedUrl, b.googleMapsLink ?? curr.googleMapsLink,
            b.heroTitle ?? curr.heroTitle, b.heroSubtitle ?? curr.heroSubtitle, b.aboutText ?? curr.aboutText,
            JSON.stringify(b.socialLinks ?? curr.socialLinks), b.emailNotificationsEnabled ? 1 : 0, b.whatsappNotificationsEnabled ? 1 : 0,
            b.legalMentions ?? curr.legalMentions, b.privacyPolicy ?? curr.privacyPolicy, b.termsOfSale ?? curr.termsOfSale
          )
          .run();
        return json({ success: true, settings: await getSafeSettings(env.DB) });
      }

      if (pathname === '/api/admin/articles' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.title || !b.excerpt || !b.content) return json({ error: 'Champs requis.' }, 400);
        const slug = `${String(b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now() % 1000}`;
        const res = await env.DB.prepare(`INSERT INTO news_articles (slug, title, category, excerpt, content, imageUrl, publishedAt, isPublished) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
          .bind(slug, b.title, b.category || 'Conseils', b.excerpt, b.content, b.imageUrl || IMG_ATELIER, new Date().toISOString())
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const artDelMatch = pathname.match(/^\/api\/admin\/articles\/(\d+)$/);
      if (artDelMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM news_articles WHERE id = ?`).bind(Number(artDelMatch[1])).run();
        return json({ success: true });
      }

      if (pathname === '/api/admin/faqs' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.question || !b.answer) return json({ error: 'Question et réponse requises.' }, 400);
        const res = await env.DB.prepare(`INSERT INTO faqs (question, answer, sortOrder, isPublished) VALUES (?, ?, 10, 1)`)
          .bind(String(b.question).trim(), String(b.answer).trim())
          .run();
        return json({ id: Number(res.meta.last_row_id) }, 201);
      }

      const faqDelMatch = pathname.match(/^\/api\/admin\/faqs\/(\d+)$/);
      if (faqDelMatch && method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM faqs WHERE id = ?`).bind(Number(faqDelMatch[1])).run();
        return json({ success: true });
      }

      if (pathname === '/api/admin/messages/reply' && method === 'POST') {
        const b: any = await request.json().catch(() => ({}));
        if (!b.userId || !b.body) return json({ error: 'Champs requis.' }, 400);
        await env.DB.prepare(`INSERT INTO messages (userId, senderRole, senderName, subject, body, isRead, createdAt) VALUES (?, 'admin', 'Équipe STRONG EVENT PRO', ?, ?, 0, ?)`)
          .bind(Number(b.userId), b.subject || 'Réponse de votre chef de projet', String(b.body).trim(), new Date().toISOString())
          .run();
        await createNotification(env.DB, Number(b.userId), 'Nouveau message de l’équipe', String(b.body).slice(0, 120));
        return json({ success: true }, 201);
      }
    }

    return json({ error: 'Route API introuvable.' }, 404);
  },
};
