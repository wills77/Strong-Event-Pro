import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'strong_event_pro.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const IMG_HERO = '/src/assets/images/hero_luxury_gala_1795461362786.jpg';
const IMG_WEDDING = '/src/assets/images/service_wedding_decor_1795461363397.jpg';
const IMG_CORP = '/src/assets/images/service_corporate_gala_1795461364781.jpg';
const IMG_CATERING = '/src/assets/images/service_luxury_catering_1795461365116.jpg';
const IMG_SOUND = '/src/assets/images/service_sound_lighting_1795461365759.jpg';
const IMG_ATELIER = '/src/assets/images/agency_casablanca_atelier_1795461365161.jpg';

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT DEFAULT '',
      city TEXT DEFAULT 'Casablanca',
      company TEXT DEFAULT '',
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'client', 'provider')),
      mustChangePassword INTEGER NOT NULL DEFAULT 0,
      resetToken TEXT,
      resetTokenExp INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      company TEXT DEFAULT '',
      city TEXT DEFAULT 'Casablanca',
      notes TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      businessName TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Casablanca',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      indicativePriceMad INTEGER,
      servicesOffered TEXT NOT NULL DEFAULT '[]',
      galleryUrls TEXT NOT NULL DEFAULT '[]',
      availabilityNotes TEXT DEFAULT '',
      imageUrl TEXT DEFAULT '',
      validationStatus TEXT NOT NULL DEFAULT 'pending' CHECK(validationStatus IN ('pending', 'approved', 'disabled')),
      isDemo INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS event_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      groupName TEXT NOT NULL,
      name TEXT NOT NULL,
      nameAr TEXT NOT NULL,
      nameEn TEXT NOT NULL,
      description TEXT NOT NULL,
      coverImage TEXT NOT NULL,
      includedServices TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      includedItems TEXT NOT NULL DEFAULT '[]',
      indicativePriceMad INTEGER,
      priceLabel TEXT NOT NULL DEFAULT 'Sur devis',
      duration TEXT DEFAULT 'Journée / Soirée',
      conditions TEXT DEFAULT '',
      isAvailable INTEGER NOT NULL DEFAULT 1,
      isActive INTEGER NOT NULL DEFAULT 1,
      imageUrl TEXT NOT NULL DEFAULT '',
      options TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS service_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      includedItems TEXT NOT NULL DEFAULT '[]',
      extraOptions TEXT NOT NULL DEFAULT '[]',
      indicativePriceMad INTEGER,
      isActive INTEGER NOT NULL DEFAULT 1,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      customerId INTEGER,
      userId INTEGER,
      eventType TEXT NOT NULL,
      clientName TEXT NOT NULL,
      clientEmail TEXT NOT NULL,
      clientPhone TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      startTime TEXT DEFAULT '19:00',
      durationHours INTEGER DEFAULT 6,
      city TEXT DEFAULT 'Casablanca',
      venue TEXT DEFAULT '',
      guestCount INTEGER DEFAULT 50,
      estimatedBudgetMad TEXT DEFAULT '',
      selectedServices TEXT NOT NULL DEFAULT '[]',
      styleTheme TEXT DEFAULT '',
      projectDescription TEXT DEFAULT '',
      specificNeeds TEXT DEFAULT '',
      attachmentUrls TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Nouvelle demande',
      extraFeesMad INTEGER NOT NULL DEFAULT 0,
      discountMad INTEGER NOT NULL DEFAULT 0,
      totalAmountMad INTEGER NOT NULL DEFAULT 0,
      validityDays INTEGER NOT NULL DEFAULT 15,
      adminNotes TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quoteId INTEGER NOT NULL,
      serviceName TEXT NOT NULL,
      description TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      unitPriceMad INTEGER NOT NULL DEFAULT 0,
      totalPriceMad INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(quoteId) REFERENCES quotes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      customerId INTEGER,
      userId INTEGER,
      clientName TEXT NOT NULL,
      clientEmail TEXT NOT NULL,
      clientPhone TEXT NOT NULL,
      eventType TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      timeSlot TEXT NOT NULL,
      venue TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Casablanca',
      guestCount INTEGER NOT NULL DEFAULT 50,
      selectedServices TEXT NOT NULL DEFAULT '[]',
      selectedPackageId INTEGER,
      options TEXT NOT NULL DEFAULT '[]',
      additionalInfo TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'En attente',
      assignedManager TEXT DEFAULT '',
      internalComments TEXT DEFAULT '',
      estimatedTotalMad INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId INTEGER,
      quoteId INTEGER,
      customerId INTEGER,
      title TEXT NOT NULL,
      eventType TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      venue TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Casablanca',
      budgetMad INTEGER NOT NULL DEFAULT 0,
      projectManager TEXT DEFAULT '',
      currentStage INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'En préparation',
      documents TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER NOT NULL,
      title TEXT NOT NULL,
      dueDate TEXT DEFAULT '',
      assignee TEXT DEFAULT '',
      isDone INTEGER NOT NULL DEFAULT 0,
      stage INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId INTEGER NOT NULL,
      providerId INTEGER NOT NULL,
      roleLabel TEXT NOT NULL,
      agreedFeeMad INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Assigné',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(providerId) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      eventId INTEGER,
      bookingId INTEGER,
      quoteId INTEGER,
      customerId INTEGER,
      paymentType TEXT NOT NULL CHECK(paymentType IN ('Acompte', 'Complément', 'Solde')),
      amountMad INTEGER NOT NULL,
      method TEXT NOT NULL DEFAULT 'Virement bancaire',
      status TEXT NOT NULL DEFAULT 'En attente' CHECK(status IN ('En attente', 'Confirmé')),
      confirmedBy TEXT DEFAULT '',
      paidAt TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT UNIQUE NOT NULL,
      quoteId INTEGER,
      eventId INTEGER,
      customerId INTEGER,
      totalMad INTEGER NOT NULL DEFAULT 0,
      paidMad INTEGER NOT NULL DEFAULT 0,
      remainingMad INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Émise',
      issuedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      eventType TEXT NOT NULL,
      eventDate TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Casablanca',
      description TEXT NOT NULL,
      galleryUrls TEXT NOT NULL DEFAULT '[]',
      videoUrl TEXT DEFAULT '',
      testimonialQuote TEXT DEFAULT '',
      testimonialAuthor TEXT DEFAULT '',
      isDemo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      authorName TEXT NOT NULL,
      authorRole TEXT NOT NULL,
      eventType TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT NOT NULL,
      isDemo INTEGER NOT NULL DEFAULT 1,
      isPublished INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS news_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      publishedAt TEXT NOT NULL,
      isPublished INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      isPublished INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      channel TEXT NOT NULL DEFAULT 'in_app',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      deliveryStatus TEXT NOT NULL DEFAULT 'Enregistrée',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      senderRole TEXT NOT NULL CHECK(senderRole IN ('client', 'admin')),
      senderName TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adminUserId INTEGER,
      adminName TEXT NOT NULL,
      action TEXT NOT NULL,
      targetType TEXT NOT NULL,
      targetId TEXT DEFAULT '',
      details TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      agencyName TEXT NOT NULL,
      slogan TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      whatsappNumber TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      openingHours TEXT NOT NULL DEFAULT '',
      googleMapsEmbedUrl TEXT NOT NULL DEFAULT '',
      googleMapsLink TEXT NOT NULL DEFAULT '',
      heroTitle TEXT NOT NULL,
      heroSubtitle TEXT NOT NULL,
      heroImageUrl TEXT NOT NULL,
      aboutText TEXT NOT NULL,
      socialLinks TEXT NOT NULL,
      budgetRanges TEXT NOT NULL,
      emailNotificationsEnabled INTEGER NOT NULL DEFAULT 0,
      whatsappNotificationsEnabled INTEGER NOT NULL DEFAULT 0,
      legalMentions TEXT NOT NULL DEFAULT '',
      privacyPolicy TEXT NOT NULL DEFAULT '',
      termsOfSale TEXT NOT NULL DEFAULT ''
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const now = new Date().toISOString();

  // 1. Seed initial Admin account (server-side only, hashed, mustChangePassword = 1)
  const existingAdmin = db.prepare(`SELECT id FROM users WHERE username = 'Admin' OR role = 'admin'`).get();
  if (!existingAdmin) {
    const initialPass = process.env.INITIAL_ADMIN_PASSWORD || '123456789';
    db.prepare(`
      INSERT INTO users (username, email, fullName, phone, city, company, passwordHash, role, mustChangePassword, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 1, ?, ?)
    `).run(
      'Admin',
      'admin@strongeventpro.local',
      'Direction STRONG EVENT PRO',
      '',
      'Casablanca',
      'STRONG EVENT PRO',
      hashPassword(initialPass),
      now,
      now
    );
  }

  // 2. Store Settings (no invented address/phone/email — configurable in Admin)
  const existingSettings = db.prepare(`SELECT id FROM store_settings WHERE id = 1`).get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO store_settings (
        id, agencyName, slogan, city, address, phone, whatsappNumber, email, openingHours,
        googleMapsEmbedUrl, googleMapsLink, heroTitle, heroSubtitle, heroImageUrl, aboutText,
        socialLinks, budgetRanges, emailNotificationsEnabled, whatsappNotificationsEnabled,
        legalMentions, privacyPolicy, termsOfSale
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `).run(
      'STRONG EVENT PRO',
      'Vos événements, notre expertise.',
      'Casablanca, Maroc',
      '',
      '',
      '',
      '',
      'Lundi – Samedi : 09h00 – 19h00 (sur rendez-vous)',
      '',
      '',
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
    );
  }

  // 3. Event Categories (22 categories across 3 groups)
  const catCount = (db.prepare(`SELECT COUNT(*) as c FROM event_categories`).get() as { c: number }).c;
  if (catCount === 0) {
    const categories: [string, string, string, string, string, string, string, string[]][] = [
      // Privés
      ['mariages', 'Événements Privés', 'Mariages', 'حفلات الزفاف', 'Weddings', 'Célébrations nuptiales sur mesure mêlant élégance contemporaine et raffinement marocain à Casablanca.', IMG_WEDDING, ['Scénographie & Décoration florale', 'Traiteur gastronomique', 'Photo & Cinéma', 'Coordination complète']],
      ['fiancailles', 'Événements Privés', 'Fiançailles', 'حفلات الخطوبة', 'Engagements', 'Réceptions intimes et cérémonies de fiançailles pensées dans les moindres détails.', IMG_WEDDING, ['Décoration de réception', 'Pâtisserie fine', 'Photographe', 'Musique d’ambiance']],
      ['anniversaires', 'Événements Privés', 'Anniversaires', 'أعياد الميلاد', 'Birthdays', 'Soirées d’anniversaire privées, dîners assis ou cocktails festifs dans des lieux d’exception.', IMG_SOUND, ['DJ & Sonorisation', 'Cake design', 'Éclairage scénique', 'Photobooth']],
      ['baptemes', 'Événements Privés', 'Baptêmes', 'حفلات العقيقة', 'Baptisms & Naming', 'Accueil chaleureux de vos proches autour d’une décoration douce et d’une restauration soignée.', IMG_CATERING, ['Décoration thématique', 'Buffet sucré-salé', 'Couverture photo']],
      ['baby-showers', 'Événements Privés', 'Baby showers', 'حفلات استقبال المولود', 'Baby Showers', 'Après-midis élégants avec mise en scène florale et animations dédiées.', IMG_ATELIER, ['Décoration personnalisée', 'Pâtisserie thématique', 'Invitations numériques']],
      ['soirees-privees', 'Événements Privés', 'Soirées privées', 'سهرات خاصة', 'Private Parties', 'Réceptions exclusives en villa ou rooftop avec direction artistique dédiée.', IMG_SOUND, ['DJ & Éclairage architectural', 'Cocktails signature', 'Sécurité & Logistique']],
      ['receptions', 'Événements Privés', 'Réceptions', 'حفلات استقبال', 'Receptions', 'Dîners de prestige et réceptions officielles orchestrés avec rigueur.', IMG_HERO, ['Art de la table', 'Service en salle', 'Traiteur haute cuisine']],
      ['celebrations-familiales', 'Événements Privés', 'Célébrations familiales', 'احتفالات عائلية', 'Family Celebrations', 'Retrouvailles, noces d’or et cérémonies familiales clés en main.', IMG_WEDDING, ['Location de mobilier', 'Traiteur', 'Reportage photo']],
      // Professionnels
      ['seminaires', 'Événements Professionnels', 'Séminaires', 'ندوات مهنية', 'Seminars', 'Journées d’étude et séminaires d’entreprise dans des cadres propices à la réflexion.', IMG_CORP, ['Sonorisation conférence', 'Écrans LED', 'Pauses café & Déjeuner']],
      ['conferences', 'Événements Professionnels', 'Conférences', 'مؤتمرات', 'Conferences', 'Production audiovisuelle complète, accueil VIP et gestion de flux pour conférences à Casablanca.', IMG_CORP, ['Captation vidéo multi-caméras', 'Vidéoprojection', 'Signalétique']],
      ['congres', 'Événements Professionnels', 'Congrès', 'مؤتمرات كبرى', 'Congresses', 'Ingénierie logistique pour congrès nationaux et internationaux multi-salles.', IMG_CORP, ['Régie technique complète', 'Accueil hôtesses', 'Supports imprimés']],
      ['galas', 'Événements Professionnels', 'Galas', 'حفلات العشاء الرسمية', 'Corporate Galas', 'Dîners de gala prestigieux, remises de trophées et soirées institutionnelles.', IMG_HERO, ['Scénographie de prestige', 'Dîner gastronomique', 'Animation musicale live']],
      ['lancements-produits', 'Événements Professionnels', 'Lancements de produits', 'إطلاق المنتجات', 'Product Launches', 'Mises en scène immersives pour révéler vos marques et innovations auprès des médias.', IMG_SOUND, ['Scénographie sur mesure', 'Couverture réseaux sociaux', 'Cocktail dînatoire']],
      ['soirees-entreprise', 'Événements Professionnels', 'Soirées d’entreprise', 'سهرات الشركات', 'Corporate Evenings', 'Fêtes annuelles et soirées de remerciement fédératrices pour vos équipes.', IMG_SOUND, ['DJ & Live Band', 'Photobooth corporate', 'Buffet gastronomique']],
      ['team-building', 'Événements Professionnels', 'Team building', 'بناء الفرق', 'Team Building', 'Activités collaboratives et expériences fédératrices sur mesure.', IMG_ATELIER, ['Animation & Coaching', 'Logistique terrain', 'Restauration']],
      ['salons-professionnels', 'Événements Professionnels', 'Salons professionnels', 'معارض مهنية', 'Trade Shows', 'Conception de stands, signalétique et logistique pour exposants.', IMG_CORP, ['Design de stand', 'Mobilier & Éclairage', 'Communication visuelle']],
      ['inaugurations', 'Événements Professionnels', 'Inaugurations', 'حفلات الافتتاح', 'Inaugurations', 'Ouvertures de showrooms, sièges sociaux et boutiques avec protocole complet.', IMG_HERO, ['Coupure de ruban', 'Cocktail VIP', 'Reportage photo & vidéo']],
      // Festifs
      ['concerts', 'Événements Festifs', 'Concerts', 'حفلات موسيقية', 'Concerts', 'Production scénique, acoustique et éclairage haute puissance pour concerts.', IMG_SOUND, ['Sonorisation concert', 'Éclairage asservi', 'Régie scène']],
      ['festivals', 'Événements Festifs', 'Festivals', 'مهرجانات', 'Festivals', 'Coordination multi-scènes, tentes, logistique visiteurs et sécurité.', IMG_SOUND, ['Tentes & Chapiteaux', 'Son & Lumière', 'Gestion flux']],
      ['soirees-vip', 'Événements Festifs', 'Soirées VIP', 'سهرات كبار الشخصيات', 'VIP Evenings', 'Accès privé, conciergerie artistique et atmosphère feutrée haut de gamme.', IMG_HERO, ['Lounge design', 'Mixologie', 'DJ résident']],
      ['evenements-musicaux', 'Événements Festifs', 'Événements musicaux', 'فعاليات موسيقية', 'Musical Events', 'Showcases, orchestres andalous, jazz ou fusion contemporaine.', IMG_SOUND, ['Groupes musicaux', 'Ingénierie son', 'Scénographie']],
      ['fetes-theme', 'Événements Festifs', 'Fêtes à thème', 'حفلات ذات طابع خاص', 'Themed Parties', 'Univers immersifs créés sur mesure : Gatsby, Mille et Une Nuits, Blanc & Or.', IMG_WEDDING, ['Décoration thématique', 'Animation artistique', 'Invitations dédiées']],
    ];
    const insertCat = db.prepare(`
      INSERT INTO event_categories (slug, groupName, name, nameAr, nameEn, description, coverImage, includedServices)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of categories) {
      insertCat.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6], JSON.stringify(c[7]));
    }
  }

  // 4. 10 Services across the 6 poles
  const srvCount = (db.prepare(`SELECT COUNT(*) as c FROM services`).get() as { c: number }).c;
  if (srvCount === 0) {
    const services: [string, string, string, string, string[], number | null, string, string, string, string, string[]][] = [
      [
        'scenographie-decoration-mariage',
        'Décoration',
        'Scénographie & Décoration de Mariage',
        'Conception globale de votre décor nuptial : arches florales, tables d’honneur, bougeoirs dorés et harmonies textiles sur mesure.',
        ['Étude scénographique 3D', 'Composition florale fraîche', 'Dressage de tables & linge ivore', 'Installation et désinstallation'],
        28000,
        'À partir de 28 000 MAD',
        'Préparation 48h + Jour J',
        'Acompte de 40 % à la validation du cahier scénographique.',
        IMG_WEDDING,
        ['Arche florale XXL', 'Chemin de table bougies cristal', 'Coin photo personnalisé'],
      ],
      [
        'decoration-florale-tables',
        'Décoration',
        'Décoration Florale & Art de la Table',
        'Centres de table botaniques, orchidées blanches, vaisselle dorée et papeterie de table raffinée pour dîners privés ou galas.',
        ['Fleurs de saison sélectionnées', 'Chandeliers en laiton brossé', 'Menus imprimés', 'Mise en place par nos fleuristes'],
        9500,
        'À partir de 9 500 MAD',
        'Installation le jour J',
        'Tarif variable selon le nombre de tables (base 10 tables).',
        IMG_ATELIER,
        ['Orchidées Phalaenopsis', 'Nappage lin naturel', 'Marque-places calligraphiés'],
      ],
      [
        'traiteur-gastronomique-banquet',
        'Restauration',
        'Traiteur Gastronomique & Banquets',
        'Cuisine marocaine contemporaine et gastronomie internationale orchestrée par nos chefs avec brigade de service complète.',
        ['Menu dégustation préalable', 'Pièces cocktails & dîner assis', 'Personnel de service en tenue', 'Vaisselle et verrerie premium'],
        450,
        'À partir de 450 MAD / convive',
        'Service complet 6h',
        'Minimum 40 convives. Options halal, végétariennes et sans allergènes.',
        IMG_CATERING,
        ['Atelier show-cooking', 'Bar à pâtisseries fines', 'Service thé à la menthe cérémonial'],
      ],
      [
        'cocktails-buffets-corporate',
        'Restauration',
        'Cocktails Dînatoires & Buffets Corporate',
        'Formules dynamiques et raffinées adaptées aux séminaires, lancements de produits et inaugurations à Casablanca.',
        ['Pièces salées & sucrées chaudes/froides', 'Boissons fraîches & café de spécialité', 'Maîtres d’hôtel dédiés', 'Dressage sur plateaux travertin'],
        320,
        'À partir de 320 MAD / personne',
        '3h à 5h de service',
        'Confirmation finale des effectifs 7 jours avant l’événement.',
        IMG_CATERING,
        ['Fontaine de jus pressés', 'Pause café VIP matin & après-midi'],
      ],
      [
        'dj-sonorisation-eclairage',
        'Sonorisation & Animation',
        'DJ, Sonorisation & Éclairage Architectural',
        'Système son haute fidélité, DJ généraliste ou électro-oriental et mise en lumière architecturale des façades et salles.',
        ['Régie Pioneer & enceintes ligne-array', 'Projecteurs architecturaux LED chaud', 'DJ professionnel + technicien son', 'Micros sans fil HF'],
        14000,
        'À partir de 14 000 MAD',
        'Soirée jusqu’à 03h00',
        'Nécessite un accès électrique conforme et un espace régie dédié.',
        IMG_SOUND,
        ['Machine à étincelles froides', 'Mur LED P3 haute définition', 'Éclairage piste asservi'],
      ],
      [
        'groupes-musicaux-live',
        'Sonorisation & Animation',
        'Orchestres Live & Ensembles Musicaux',
        'Quatuors à cordes, orchestres andalous, groupes jazz ou formations chaâbi chic sélectionnés pour sublimer chaque temps fort.',
        ['Artistes professionnels vérifiés', 'Balance acoustique avant arrivée', 'Répertoire personnalisé', 'Coordination avec le maître de cérémonie'],
        18000,
        'À partir de 18 000 MAD',
        '2 à 4 sets de 45 min',
        'Loges et rafraîchissements requis pour les musiciens.',
        IMG_SOUND,
        ['Violoniste d’accueil', 'Issawa / Dakka Marrakchia prestige', 'Trio Jazz cocktail'],
      ],
      [
        'photographe-videaste-cinema',
        'Photo & Vidéo',
        'Photographie Éditoriale & Film Cinéma',
        'Couverture complète en duo photo + vidéo 4K avec étalonnage cinéma, teaser rapide et galerie privée haute définition.',
        ['2 photographes/vidéastes seniors', 'Captation drone (sous autorisation)', 'Film complet + teaser 3 min', 'Galerie numérique privée'],
        16000,
        'À partir de 16 000 MAD',
        'Couverture jusqu’à 10h',
        'Livraison du teaser sous 7 jours ouvrés et reportage complet sous 21 jours.',
        IMG_HERO,
        ['Photobooth miroir doré', 'Album fine-art relié lin', 'SDE (Same Day Edit) projeté le soir même'],
      ],
      [
        'capture-conference-streaming',
        'Photo & Vidéo',
        'Captation Conférence & Diffusion Multi-Caméras',
        'Enregistrement multi-angles, incrustation des présentations et streaming privé pour vos congrès et séminaires.',
        ['3 caméras HD/4K sur régie', 'Prise de son directe console', 'Montage chapitré par intervenant', 'Export réseaux sociaux'],
        15000,
        'À partir de 15 000 MAD',
        'Journée complète (8h)',
        'Test technique J-1 inclus sur site à Casablanca.',
        IMG_CORP,
        ['Streaming privé sécurisé', 'Interviews participants à chaud'],
      ],
      [
        'logistique-mobilier-chapiteaux',
        'Logistique',
        'Location de Mobilier, Tentes & Logistique Complète',
        'Chapiteaux transparents, chaises médaillon velours, tables banquets, transport et équipes de montage certifiées.',
        ['Transport aller-retour Casablanca & région', 'Mobilier design entretenu', 'Tentes modulaires avec plancher', 'Équipe montage et démontage'],
        12000,
        'À partir de 12 000 MAD',
        'Location 24h à 72h',
        'Visite technique préalable obligatoire pour les installations extérieures.',
        IMG_CORP,
        ['Chauffages extérieurs design', 'Groupe électrogène silencieux', 'Piste de danse miroir'],
      ],
      [
        'communication-identite-invitations',
        'Communication',
        'Identité Visuelle, Invitations Numériques & Couverture Sociale',
        'Création du monogramme ou charte de l’événement, invitations interactives WhatsApp/web avec suivi RSVP et couverture live.',
        ['Monogramme & charte graphique', 'Site / invitation RSVP digitale', 'Supports imprimés (programmes, badges)', 'Reels temps réel'],
        7500,
        'À partir de 7 500 MAD',
        'Livraison sous 10 jours',
        'Validation des maquettes avant lancement d’impression.',
        IMG_ATELIER,
        ['Impression papier coton dorure à chaud', 'Community manager sur site'],
      ],
    ];
    const insSrv = db.prepare(`
      INSERT INTO services (slug, category, name, description, includedItems, indicativePriceMad, priceLabel, duration, conditions, imageUrl, options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of services) {
      insSrv.run(s[0], s[1], s[2], s[3], JSON.stringify(s[4]), s[5], s[6], s[7], s[8], s[9], JSON.stringify(s[10]));
    }
  }

  // 5. 4 Service Packages
  const pkgCount = (db.prepare(`SELECT COUNT(*) as c FROM service_packages`).get() as { c: number }).c;
  if (pkgCount === 0) {
    const pkgs: [string, string, string, string, string[], string[], number | null, number][] = [
      [
        'pack-essentiel',
        'PACK ESSENTIEL',
        'Organisation cadrée & coordination fluide',
        'Idéal pour les réceptions intimes ou réunions professionnelles disposant déjà de leur lieu et souhaitant une exécution irréprochable.',
        [
          'Élaboration du rétroplanning et conducteur minuté',
          'Coordination complète le jour J (1 chef de projet)',
          'Sélection et briefing de 3 prestataires clés',
          'Gestion logistique accueil et timing',
        ],
        ['Hôtesse d’accueil supplémentaire', 'Photobooth élégant', 'Invitations numériques'],
        18000,
        1,
      ],
      [
        'pack-premium',
        'PACK PREMIUM',
        'Direction artistique, décoration & prestataires sélectionnés',
        'Notre formule signature pour les mariages, lancements de marque et séminaires exigeant un accompagnement complet.',
        [
          'Conception créative et planche d’ambiance dédiée',
          'Décoration florale et art de la table personnalisés',
          'Sonorisation, éclairage d’ambiance et couverture photo',
          'Chef de projet senior + assistant(e) le jour J',
          'Gestion contractuelle et budgétaire des prestataires',
        ],
        ['Vidéaste cinéma + drone', 'Orchestre live ou DJ signature', 'Scénographie entrée VIP'],
        48000,
        2,
      ],
      [
        'pack-prestige',
        'PACK PRESTIGE',
        'Production intégrale haute couture & accompagnement dédié',
        'L’excellence événementielle sans compromis pour galas, grands mariages et congrès d’envergure à Casablanca.',
        [
          'Direction de production intégrale de J-90 à J+7',
          'Scénographie architecturale sur mesure et mobilier exclusif',
          'Traiteur gastronomique et brigade dédiée',
          'Production audiovisuelle complète (photo, film 4K, écrans LED)',
          'Équipe de coordination sur site (3 à 5 régisseurs) & conciergerie VIP',
        ],
        ['Artistes internationaux', 'Chapiteau transparent sur mesure', 'Couverture média & relations presse'],
        115000,
        3,
      ],
      [
        'pack-sur-mesure',
        'PACK SUR MESURE',
        'Architecture 100 % personnalisée selon votre cahier des charges',
        'Conçu pour les projets uniques, multi-jours ou à fortes exigences techniques et protocolaires.',
        [
          'Audit complet du besoin et visite technique de repérage',
          'Sélection libre des pôles (décoration, technique, restauration, communication)',
          'Budget transparent ventilé poste par poste en MAD',
          'Équipe dédiée dimensionnée selon l’ampleur de l’événement',
        ],
        ['Production multi-sites', 'Régie simultanée', 'Traduction simultanée & équipements spéciaux'],
        null,
        4,
      ],
    ];
    const insPkg = db.prepare(`
      INSERT INTO service_packages (slug, name, subtitle, description, includedItems, extraOptions, indicativePriceMad, isActive, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    for (const p of pkgs) {
      insPkg.run(p[0], p[1], p[2], p[3], JSON.stringify(p[4]), JSON.stringify(p[5]), p[6], p[7]);
    }
  }

  // 6. 8 Demo Providers (clearly marked isDemo = 1)
  const provCount = (db.prepare(`SELECT COUNT(*) as c FROM providers`).get() as { c: number }).c;
  if (provCount === 0) {
    const providers: [string, string, string, string, number, string[], string, string][] = [
      ['Maison Alizes Gastronomie (Démo)', 'Traiteurs', 'Service traiteur gastronomique marocain et fusion méditerranéenne pour réceptions et galas.', 'Casablanca', 420, ['Dîners assis', 'Cocktails VIP', 'Pâtisserie événementielle'], 'Disponible week-ends sur réservation 3 semaines à l’avance', IMG_CATERING],
      ['Atelier Blanc & Or Scénographie (Démo)', 'Décorateurs', 'Création de décors architecturaux, arches florales et art de la table contemporain.', 'Casablanca', 22000, ['Scénographie mariage', 'Décors corporate', 'Location mobilier laiton'], '2 événements max par week-end', IMG_WEDDING],
      ['Studio Lumière Maghreb (Démo)', 'Photographes', 'Collectif de photographes éditoriaux spécialisé en mariages et sommets d’entreprise.', 'Casablanca', 11000, ['Reportage éditorial', 'Portraits corporate', 'Tirages fine art'], 'Calendrier ouvert 2026–2027', IMG_ATELIER],
      ['Horizon Cinéma Productions (Démo)', 'Vidéastes', 'Réalisation de films événementiels 4K, captations multi-caméras et teasers rapides.', 'Rabat / Casablanca', 14000, ['Film mariage cinéma', 'Aftermovie corporate', 'Streaming live'], 'Équipe mobile sur tout le Maroc', IMG_CORP],
      ['SoundWave Régie & DJ (Démo)', 'DJ', 'Ingénierie sonore haut de gamme, éclairage architectural LED et sets DJ sur mesure.', 'Casablanca', 12000, ['DJ set fusion', 'Sonorisation conférence', 'Mise en lumière façade'], 'Matériel propre révisé', IMG_SOUND],
      ['Ensemble Tarab & Jazz (Démo)', 'Musiciens', 'Formation modulable mêlant musique arabo-andalouse, cordes classiques et jazz lounge.', 'Casablanca', 16000, ['Cocktail acoustique', 'Orchestre de gala', 'Accueil VIP'], 'Sur réservation préalable', IMG_HERO],
      ['Palais & Pavillons d’Anfa (Démo)', 'Loueurs de salles', 'Espaces de réception modulables avec jardins, terrasses et capacité jusqu’à 600 convives.', 'Casablanca', 45000, ['Salles de gala', 'Espaces séminaires', 'Terrasse cocktail'], 'Visites sur rendez-vous', IMG_HERO],
      ['Maison Flora Botanique (Démo)', 'Fleuristes', 'Compositions florales sculpturales à partir de fleurs fraîches locales et importées.', 'Casablanca', 8500, ['Centres de table', 'Arches cérémonielles', 'Installations suspendues'], 'Commande confirmée à J-14', IMG_WEDDING],
    ];
    const insProv = db.prepare(`
      INSERT INTO providers (businessName, category, description, city, phone, email, indicativePriceMad, servicesOffered, galleryUrls, availabilityNotes, imageUrl, validationStatus, isDemo, createdAt)
      VALUES (?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, 'approved', 1, ?)
    `);
    for (const pr of providers) {
      insProv.run(pr[0], pr[1], pr[2], pr[3], pr[4], JSON.stringify(pr[5]), JSON.stringify([pr[7]]), pr[6], pr[7], now);
    }
  }

  // 7. 10 Demo Portfolio Realizations (clearly marked isDemo = 1)
  const portCount = (db.prepare(`SELECT COUNT(*) as c FROM portfolio`).get() as { c: number }).c;
  if (portCount === 0) {
    const items: [string, string, string, string, string, string, string, string][] = [
      ['Gala Annuel Atlantique (Projet de démonstration)', 'Galas', '2026-05-14', 'Casablanca', 'Exemple de dîner de gala pour 320 dirigeants avec scénographie dorée, éclairage architectural et orchestre live.', IMG_HERO, 'Une coordination millimétrée et une atmosphère mémorable.', 'Direction Communication (Démonstration)'],
      ['Mariage Blanc & Laiton à Anfa (Projet de démonstration)', 'Mariages', '2026-06-20', 'Casablanca', 'Concept scénographique mêlant zellige traditionnel, orchidées blanches et chandeliers en laiton brossé.', IMG_WEDDING, 'Chaque détail de la table reflétait exactement notre souhait.', 'Couple invité (Démonstration)'],
      ['Sommet Financier Horizon 2026 (Projet de démonstration)', 'Conférences', '2026-04-09', 'Casablanca', 'Production audiovisuelle complète : scène panoramique, sonorisation HF et espace networking VIP.', IMG_CORP, 'Qualité technique irréprochable tout au long des deux journées.', 'Comité d’organisation (Démonstration)'],
      ['Cocktail Gastronomique Maison d’Art (Projet de démonstration)', 'Lancements de produits', '2026-03-22', 'Casablanca', 'Présentation de collection privée avec bar gastronomique sur travertin et ambiance acoustique feutrée.', IMG_CATERING, 'Nos invités ont été séduits par le dressage et la fluidité du service.', 'Responsable Marque (Démonstration)'],
      ['Soirée VIP Courtyard Lights (Projet de démonstration)', 'Soirées VIP', '2026-07-11', 'Casablanca', 'Mise en lumière spectaculaire d’un patio architectural avec DJ set et bar à mixologie.', IMG_SOUND, 'Ambiance électrisante et élégante jusqu’au bout de la nuit.', 'Hôte privé (Démonstration)'],
      ['Séminaire Exécutif Corniche (Projet de démonstration)', 'Séminaires', '2026-02-18', 'Casablanca', 'Journée stratégique de 80 cadres incluant ateliers collaboratifs et déjeuner gastronomique.', IMG_CORP, 'Logistique transparente, nos équipes ont pu rester concentrées sur le contenu.', 'DRH Groupe (Démonstration)'],
      ['Réception Privée des Jardins (Projet de démonstration)', 'Soirées privées', '2026-08-05', 'Bouskoura', 'Dîner aux chandelles sous les oliviers avec dressage lin naturel et trio de jazz acoustique.', IMG_WEDDING, 'Un moment hors du temps parfaitement orchestré.', 'Famille hôte (Démonstration)'],
      ['Anniversaire 40 ans Signature (Projet de démonstration)', 'Anniversaires', '2026-09-12', 'Casablanca', 'Soirée thématique Noir & Champagne avec photobooth éditorial et piste de danse éclairée.', IMG_SOUND, 'Organisation sans stress du premier échange jusqu’au lendemain.', 'Client test (Démonstration)'],
      ['Inauguration Flagship Boulevard d’Anfa (Projet de démonstration)', 'Inaugurations', '2026-01-29', 'Casablanca', 'Coupure de ruban protocolaire, cocktail dînatoire et couverture photo/vidéo pour les réseaux.', IMG_CATERING, 'Un lancement réussi qui a marqué nos partenaires.', 'Directeur Retail (Démonstration)'],
      ['Atelier de Création & Scénographie (Projet de démonstration)', 'Événements d’entreprise', '2026-10-03', 'Casablanca', 'Session immersive de co-design événementiel avec moodboards matières et maquettes d’implantation.', IMG_ATELIER, 'Une approche créative rigoureuse et rassurante.', 'Agence partenaire (Démonstration)'],
    ];
    const insPort = db.prepare(`
      INSERT INTO portfolio (title, eventType, eventDate, city, description, galleryUrls, videoUrl, testimonialQuote, testimonialAuthor, isDemo, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 1, ?)
    `);
    for (const p of items) {
      insPort.run(p[0], p[1], p[2], p[3], p[4], JSON.stringify([p[5]]), p[6], p[7], now);
    }
  }

  // 8. Demo Testimonials
  const revCount = (db.prepare(`SELECT COUNT(*) as c FROM reviews`).get() as { c: number }).c;
  if (revCount === 0) {
    const revs = [
      ['Salma Benali (Profil démo)', 'Mariée — Réception à Anfa', 'Mariages', 5, 'L’équipe a su traduire nos inspirations en une scénographie blanche et dorée d’une rare élégance, avec un suivi rassurant à chaque étape.'],
      ['Karim El Mansouri (Profil démo)', 'Directeur Marketing — Secteur Financier', 'Conférences', 5, 'De la régie audiovisuelle à l’accueil des intervenants, notre conférence annuelle à Casablanca s’est déroulée sans la moindre fausse note.'],
      ['Nadia Tazi (Profil démo)', 'Organisatrice d’anniversaire privé', 'Soirées privées', 5, 'Réactivité exemplaire, prestataires fiables et gestion rigoureuse du budget en MAD.'],
    ];
    const insRev = db.prepare(`INSERT INTO reviews (authorName, authorRole, eventType, rating, comment, isDemo, isPublished, createdAt) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`);
    for (const r of revs) insRev.run(r[0], r[1], r[2], r[3], r[4], now);
  }

  // 9. News & Tips Articles
  const newsCount = (db.prepare(`SELECT COUNT(*) as c FROM news_articles`).get() as { c: number }).c;
  if (newsCount === 0) {
    const articles = [
      [
        'tendances-scenographie-mariage-casablanca',
        'Scénographie contemporaine : marier l’artisanat marocain au minimalisme champagne',
        'Tendances & Design',
        'Comment associer zellige, lin naturel, laiton brossé et compositions florales sculpturales pour une réception intemporelle.',
        'La tendance actuelle à Casablanca privilégie la pureté des lignes architecturales réchauffée par des matières nobles : nappages en lin ivoire, bougeoirs élancés en laiton et compositions florales monochromes. En travaillant l’éclairage indirect dès la phase d’étude, chaque espace révèle une profondeur photographique exceptionnelle.',
        IMG_WEDDING,
      ],
      [
        'organiser-conference-entreprise-reussie',
        'Checklist technique : les 7 points clés d’un séminaire ou congrès sans accroc',
        'Événements Corporate',
        'De l’acoustique de salle au repérage J-1, découvrez la méthode STRONG EVENT PRO pour sécuriser vos prises de parole.',
        'Un événement professionnel réussi repose sur une préparation invisible mais rigoureuse : redondance audio, calibrage des écrans selon la luminosité ambiante, signalétique fluide dès l’accueil et timing millimétré des pauses restauration. Nos chefs de projet valident chaque point via notre checklist en 7 étapes.',
        IMG_CORP,
      ],
      [
        'maitriser-budget-evenementiel-mad',
        'Comment structurer et optimiser votre budget événementiel en MAD',
        'Conseils Budget',
        'Répartition des postes clés, priorisation des choix à fort impact visuel et gestion des acomptes en toute transparence.',
        'Allouer intelligemment son budget implique d’identifier les pôles à plus fort impact pour vos invités : l’accueil, l’ambiance lumineuse et la qualité de la restauration. Nos devis détaillés ligne par ligne permettent d’ajuster chaque prestation avant validation.',
        IMG_ATELIER,
      ],
    ];
    const insNews = db.prepare(`INSERT INTO news_articles (slug, title, category, excerpt, content, imageUrl, publishedAt, isPublished) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
    for (const a of articles) insNews.run(a[0], a[1], a[2], a[3], a[4], a[5], now);
  }

  // 10. FAQs
  const faqCount = (db.prepare(`SELECT COUNT(*) as c FROM faqs`).get() as { c: number }).c;
  if (faqCount === 0) {
    const faqs = [
      ['Comment fonctionne la validation d’une réservation sur STRONG EVENT PRO ?', 'Toute demande de réservation enregistrée en ligne reste au statut « En attente » jusqu’à ce que notre équipe à Casablanca vérifie les disponibilités des lieux, des prestataires et les conditions logistiques.', 1],
      ['Dans quels délais recevons-nous un devis personnalisé ?', 'Après soumission de votre demande, notre équipe étudie votre projet et vous transmet une proposition chiffrée détaillée en MAD sous 24 à 48 heures ouvrées.', 2],
      ['Intervenez-vous uniquement à Casablanca ?', 'Notre agence est basée à Casablanca et coordonne régulièrement des événements dans toute la région (Bouskoura, Mohammedia, Rabat, Marrakech) sur demande.', 3],
      ['Puis-je suivre l’avancement de mon événement et mes factures en ligne ?', 'Oui. Depuis votre Espace Client sécurisé, vous consultez vos devis, acceptez ou refusez les propositions, suivez les 7 étapes de préparation et téléchargez vos reçus et factures.', 4],
      ['Comment les prestataires peuvent-ils rejoindre le réseau ?', 'Les candidatures prestataires sont étudiées et validées par notre administration avant toute publication dans l’annuaire public.', 5],
    ];
    const insFaq = db.prepare(`INSERT INTO faqs (question, answer, sortOrder, isPublished) VALUES (?, ?, ?, 1)`);
    for (const f of faqs) insFaq.run(f[0], f[1], f[2]);
  }

  // 11. Demo Clients, Quotes, Bookings & Managed Events (zero fake confirmed revenue!)
  const custCount = (db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as { c: number }).c;
  if (custCount === 0) {
    const clientPass = hashPassword('DemoClient2026!');
    const u1 = db.prepare(`
      INSERT INTO users (username, email, fullName, phone, city, company, passwordHash, role, mustChangePassword, createdAt, updatedAt)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, 'client', 0, ?, ?)
    `).run('demo.client@exemple.ma', 'Yasmine Chraïbi (Compte démo)', '0600000001', 'Casablanca', '', clientPass, now, now);

    const c1 = db.prepare(`
      INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(u1.lastInsertRowid, 'Yasmine Chraïbi (Compte démo)', 'demo.client@exemple.ma', '0600000001', '', 'Casablanca', 'Profil client de démonstration', now);

    const c2 = db.prepare(`
      INSERT INTO customers (userId, fullName, email, phone, company, city, notes, createdAt)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)
    `).run('Atlas Corporate Demo', 'contact@atlas-demo.ma', '0522000002', 'Atlas Corporate Demo', 'Casablanca', 'Compte entreprise de démonstration', now);

    // Demo Quotes
    const q1 = db.prepare(`
      INSERT INTO quotes (
        reference, customerId, userId, eventType, clientName, clientEmail, clientPhone,
        eventDate, startTime, durationHours, city, venue, guestCount, estimatedBudgetMad,
        selectedServices, styleTheme, projectDescription, specificNeeds, attachmentUrls,
        status, extraFeesMad, discountMad, totalAmountMad, validityDays, adminNotes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, 0, 0, ?, 15, ?, ?, ?)
    `).run(
      'SEP-DEV-2026-1001',
      c1.lastInsertRowid,
      u1.lastInsertRowid,
      'Mariages',
      'Yasmine Chraïbi (Compte démo)',
      'demo.client@exemple.ma',
      '0600000001',
      '2026-12-19',
      '19:30',
      8,
      'Casablanca',
      'Domaine Anfa (à confirmer)',
      180,
      '80 000 – 150 000 MAD',
      JSON.stringify(['Scénographie & Décoration de Mariage', 'Photographie Éditoriale & Film Cinéma']),
      'Blanc ivoire & Doré champagne',
      'Réception nuptiale contemporaine avec dîner assis et orchestre acoustique.',
      'Accueil thé à la menthe et coin photos fleuri.',
      'Devis envoyé',
      92000,
      'Proposition chiffrée envoyée au client pour validation.',
      now,
      now
    );

    db.prepare(`INSERT INTO quote_items (quoteId, serviceName, description, quantity, unitPriceMad, totalPriceMad) VALUES (?, ?, ?, ?, ?, ?)`).run(
      q1.lastInsertRowid, 'Scénographie & Décoration de Mariage', 'Arche florale, 18 tables dressées lin et laiton', 1, 48000, 48000
    );
    db.prepare(`INSERT INTO quote_items (quoteId, serviceName, description, quantity, unitPriceMad, totalPriceMad) VALUES (?, ?, ?, ?, ?, ?)`).run(
      q1.lastInsertRowid, 'Pack Premium Coordination', 'Direction artistique et coordination Jour J', 1, 28000, 28000
    );
    db.prepare(`INSERT INTO quote_items (quoteId, serviceName, description, quantity, unitPriceMad, totalPriceMad) VALUES (?, ?, ?, ?, ?, ?)`).run(
      q1.lastInsertRowid, 'Photographie Éditoriale & Film Cinéma', 'Duo photo + film 4K', 1, 16000, 16000
    );

    db.prepare(`
      INSERT INTO quotes (
        reference, customerId, userId, eventType, clientName, clientEmail, clientPhone,
        eventDate, startTime, durationHours, city, venue, guestCount, estimatedBudgetMad,
        selectedServices, styleTheme, projectDescription, specificNeeds, attachmentUrls,
        status, extraFeesMad, discountMad, totalAmountMad, validityDays, adminNotes, createdAt, updatedAt
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'Nouvelle demande', 0, 0, 0, 15, '', ?, ?)
    `).run(
      'SEP-DEV-2026-1002',
      c2.lastInsertRowid,
      'Séminaires',
      'Atlas Corporate Demo',
      'contact@atlas-demo.ma',
      '0522000002',
      '2026-12-10',
      '08:30',
      8,
      'Casablanca',
      'Centre de conférences Marina',
      120,
      '30 000 – 80 000 MAD',
      JSON.stringify(['Cocktails Dînatoires & Buffets Corporate', 'Captation Conférence & Diffusion Multi-Caméras']),
      'Sobre & Corporate',
      'Séminaire annuel des équipes commerciales avec plénière et déjeuner.',
      '2 micros cravates et traduction FR/EN.',
      now,
      now
    );

    // Demo Bookings
    const b1 = db.prepare(`
      INSERT INTO bookings (
        reference, customerId, userId, clientName, clientEmail, clientPhone,
        eventType, eventDate, timeSlot, venue, city, guestCount,
        selectedServices, selectedPackageId, options, additionalInfo,
        status, assignedManager, internalComments, estimatedTotalMad, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SEP-RES-2026-2001',
      c1.lastInsertRowid,
      u1.lastInsertRowid,
      'Yasmine Chraïbi (Compte démo)',
      'demo.client@exemple.ma',
      '0600000001',
      'Mariages',
      '2026-12-19',
      'Soirée (18h00 – 02h00)',
      'Domaine Anfa, Casablanca',
      'Casablanca',
      180,
      JSON.stringify(['Scénographie & Décoration de Mariage', 'Photographie Éditoriale & Film Cinéma']),
      2,
      JSON.stringify(['Arche florale XXL', 'SDE (Same Day Edit)']),
      'Dossier de démonstration suivi en 7 étapes.',
      'Confirmée',
      'Responsable Scénographie',
      'Disponibilités vérifiées pour le 19/12.',
      92000,
      now,
      now
    );

    db.prepare(`
      INSERT INTO bookings (
        reference, customerId, userId, clientName, clientEmail, clientPhone,
        eventType, eventDate, timeSlot, venue, city, guestCount,
        selectedServices, selectedPackageId, options, additionalInfo,
        status, assignedManager, internalComments, estimatedTotalMad, createdAt, updatedAt
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'En attente', '', '', ?, ?, ?)
    `).run(
      'SEP-RES-2026-2002',
      c2.lastInsertRowid,
      'Atlas Corporate Demo',
      'contact@atlas-demo.ma',
      '0522000002',
      'Conférences',
      '2026-12-28',
      'Journée complète (08h00 – 18h00)',
      'Casablanca Finance City',
      'Casablanca',
      140,
      JSON.stringify(['Captation Conférence & Diffusion Multi-Caméras', 'Cocktails Dînatoires & Buffets Corporate']),
      1,
      JSON.stringify(['Streaming privé sécurisé']),
      'En attente de validation technique sur site.',
      48000,
      now,
      now
    );

    // Demo Managed Event (linked to b1)
    const ev1 = db.prepare(`
      INSERT INTO events (bookingId, quoteId, customerId, title, eventType, eventDate, venue, city, budgetMad, projectManager, currentStage, status, documents, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, 'En préparation', ?, ?)
    `).run(
      b1.lastInsertRowid,
      q1.lastInsertRowid,
      c1.lastInsertRowid,
      'Réception Nuptiale Démo — Anfa',
      'Mariages',
      '2026-12-19',
      'Domaine Anfa, Casablanca',
      'Casablanca',
      92000,
      'Chef de projet Senior',
      JSON.stringify([{ name: 'Plan d’implantation scénographique (Démo)', url: '#' }]),
      now
    );

    const insTask = db.prepare(`INSERT INTO tasks (eventId, title, dueDate, assignee, isDone, stage, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insTask.run(ev1.lastInsertRowid, 'Valider le cahier des charges et la palette florale', '2026-11-28', 'Directeur Artistique', 1, 1, now);
    insTask.run(ev1.lastInsertRowid, 'Confirmer le devis détaillé et les quantités convives', '2026-12-01', 'Direction', 1, 2, now);
    insTask.run(ev1.lastInsertRowid, 'Bloquer les créneaux fleuriste et équipe photo/vidéo', '2026-12-05', 'Coordinateur Prestataires', 0, 3, now);
    insTask.run(ev1.lastInsertRowid, 'Visite technique finale sur le lieu à Casablanca', '2026-12-14', 'Chef de projet Senior', 0, 4, now);
    insTask.run(ev1.lastInsertRowid, 'Installation décor, tables et régie lumière', '2026-12-18', 'Équipe Technique', 0, 5, now);

    db.prepare(`INSERT INTO event_assignments (eventId, providerId, roleLabel, agreedFeeMad, status, createdAt) VALUES (?, 2, 'Scénographie & Décoration', 22000, 'Confirmé', ?)`).run(ev1.lastInsertRowid, now);
    db.prepare(`INSERT INTO event_assignments (eventId, providerId, roleLabel, agreedFeeMad, status, createdAt) VALUES (?, 3, 'Reportage Photo Éditorial', 11000, 'En attente', ?)`).run(ev1.lastInsertRowid, now);

    // Demo Invoice (unpaid / pending confirmation — 0 MAD paid so no fake confirmed revenue!)
    db.prepare(`
      INSERT INTO invoices (invoiceNumber, quoteId, eventId, customerId, totalMad, paidMad, remainingMad, status, issuedAt)
      VALUES ('FAC-2026-0001', ?, ?, ?, 92000, 0, 92000, 'En attente de règlement', ?)
    `).run(q1.lastInsertRowid, ev1.lastInsertRowid, c1.lastInsertRowid, now);

    // Demo notification for demo client
    db.prepare(`
      INSERT INTO notifications (userId, channel, title, message, isRead, deliveryStatus, createdAt)
      VALUES (?, 'in_app', 'Devis disponible', 'Votre devis de démonstration SEP-DEV-2026-1001 est consultable dans votre espace client.', 0, 'Livrée', ?)
    `).run(u1.lastInsertRowid, now);
  }
}

export function logAdminAction(
  adminUserId: number | null,
  adminName: string,
  action: string,
  targetType: string,
  targetId: string | number | bigint = '',
  details = ''
): void {
  db.prepare(`
    INSERT INTO admin_audit_logs (adminUserId, adminName, action, targetType, targetId, details, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminUserId, adminName, action, targetType, String(targetId), details, new Date().toISOString());
}

export function createNotification(
  userId: number | null,
  title: string,
  message: string
): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (userId, channel, title, message, isRead, deliveryStatus, createdAt)
    VALUES (?, 'in_app', ?, ?, 0, 'Livrée', ?)
  `).run(userId, title, message, now);

  // Check if external Email/WhatsApp integrations are genuinely configured before logging external dispatch
  const settings = db.prepare(`SELECT emailNotificationsEnabled, whatsappNotificationsEnabled FROM store_settings WHERE id = 1`).get() as
    | { emailNotificationsEnabled: number; whatsappNotificationsEnabled: number }
    | undefined;

  const emailReady = Boolean(settings?.emailNotificationsEnabled && process.env.SMTP_HOST && process.env.SMTP_USER);
  const waReady = Boolean(settings?.whatsappNotificationsEnabled && process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (emailReady) {
    db.prepare(`
      INSERT INTO notifications (userId, channel, title, message, isRead, deliveryStatus, createdAt)
      VALUES (?, 'email', ?, ?, 0, 'En file SMTP', ?)
    `).run(userId, title, message, now);
  }
  if (waReady) {
    db.prepare(`
      INSERT INTO notifications (userId, channel, title, message, isRead, deliveryStatus, createdAt)
      VALUES (?, 'whatsapp', ?, ?, 0, 'En file WhatsApp API', ?)
    `).run(userId, title, message, now);
  }
}
