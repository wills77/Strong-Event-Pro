-- STRONG EVENT PRO — Schema Cloudflare D1 (SQLite)

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
