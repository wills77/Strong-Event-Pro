export type Lang = 'fr' | 'ar' | 'en';

export type UserRole = 'admin' | 'client' | 'provider';

export interface AuthUser {
  id: number;
  username: string | null;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  company: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface EventCategory {
  id: number;
  slug: string;
  groupName: 'Événements Privés' | 'Événements Professionnels' | 'Événements Festifs';
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  coverImage: string;
  includedServices: string[];
}

export interface ServiceItem {
  id: number;
  slug: string;
  category:
    | 'Décoration'
    | 'Restauration'
    | 'Sonorisation & Animation'
    | 'Photo & Vidéo'
    | 'Logistique'
    | 'Communication';
  name: string;
  description: string;
  includedItems: string[];
  indicativePriceMad: number | null;
  priceLabel: string;
  duration: string;
  conditions: string;
  isAvailable: boolean;
  isActive: boolean;
  imageUrl: string;
  options: string[];
}

export interface ServicePackage {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  includedItems: string[];
  extraOptions: string[];
  indicativePriceMad: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ProviderProfile {
  id: number;
  userId: number | null;
  businessName: string;
  category: string;
  description: string;
  city: string;
  phone: string;
  email: string;
  indicativePriceMad: number | null;
  servicesOffered: string[];
  galleryUrls: string[];
  availabilityNotes: string;
  imageUrl: string;
  validationStatus: 'pending' | 'approved' | 'disabled';
  isDemo: boolean;
  createdAt: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  eventType: string;
  eventDate: string;
  city: string;
  description: string;
  galleryUrls: string[];
  videoUrl: string;
  testimonialQuote: string;
  testimonialAuthor: string;
  isDemo: boolean;
  createdAt: string;
}

export type QuoteStatus =
  | 'Nouvelle demande'
  | "En cours d'étude"
  | 'Devis envoyé'
  | 'En attente de validation'
  | 'Accepté'
  | 'Refusé'
  | 'Terminé';

export interface QuoteItemLine {
  id?: number;
  quoteId?: number;
  serviceName: string;
  description: string;
  quantity: number;
  unitPriceMad: number;
  totalPriceMad: number;
}

export interface QuoteRecord {
  id: number;
  reference: string;
  customerId: number | null;
  userId: number | null;
  eventType: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventDate: string;
  startTime: string;
  durationHours: number;
  city: string;
  venue: string;
  guestCount: number;
  estimatedBudgetMad: string;
  selectedServices: string[];
  styleTheme: string;
  projectDescription: string;
  specificNeeds: string;
  attachmentUrls: string[];
  status: QuoteStatus;
  extraFeesMad: number;
  discountMad: number;
  totalAmountMad: number;
  validityDays: number;
  adminNotes: string;
  items?: QuoteItemLine[];
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'En attente'
  | 'En cours de confirmation'
  | 'Confirmée'
  | 'En préparation'
  | 'En cours de réalisation'
  | 'Terminée'
  | 'Annulée';

export interface BookingRecord {
  id: number;
  reference: string;
  customerId: number | null;
  userId: number | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  timeSlot: string;
  venue: string;
  city: string;
  guestCount: number;
  selectedServices: string[];
  selectedPackageId: number | null;
  options: string[];
  additionalInfo: string;
  status: BookingStatus;
  assignedManager: string;
  internalComments: string;
  estimatedTotalMad: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventTask {
  id: number;
  eventId: number;
  title: string;
  dueDate: string;
  assignee: string;
  isDone: boolean;
  stage: number;
}

export interface EventAssignment {
  id: number;
  eventId: number;
  providerId: number;
  businessName?: string;
  category?: string;
  roleLabel: string;
  agreedFeeMad: number;
  status: string;
}

export interface ManagedEvent {
  id: number;
  bookingId: number | null;
  quoteId: number | null;
  customerId: number | null;
  clientName?: string;
  title: string;
  eventType: string;
  eventDate: string;
  venue: string;
  city: string;
  budgetMad: number;
  projectManager: string;
  currentStage: number;
  status: string;
  documents: { name: string; url: string }[];
  tasks?: EventTask[];
  assignments?: EventAssignment[];
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  reference: string;
  eventId: number | null;
  bookingId: number | null;
  quoteId: number | null;
  customerId: number | null;
  clientName?: string;
  paymentType: 'Acompte' | 'Complément' | 'Solde';
  amountMad: number;
  method: string;
  status: 'En attente' | 'Confirmé';
  confirmedBy: string;
  paidAt: string;
  notes: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: number;
  invoiceNumber: string;
  quoteId: number | null;
  eventId: number | null;
  customerId: number | null;
  clientName?: string;
  totalMad: number;
  paidMad: number;
  remainingMad: number;
  status: string;
  issuedAt: string;
}

export interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  publishedAt: string;
  isPublished: boolean;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ReviewItem {
  id: number;
  authorName: string;
  authorRole: string;
  eventType: string;
  rating: number;
  comment: string;
  isDemo: boolean;
  isPublished: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number | null;
  channel: 'in_app' | 'email' | 'whatsapp';
  title: string;
  message: string;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: string;
}

export interface ClientMessage {
  id: number;
  userId: number;
  senderRole: 'client' | 'admin';
  senderName: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface StoreSettings {
  agencyName: string;
  slogan: string;
  city: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  openingHours: string;
  googleMapsEmbedUrl: string;
  googleMapsLink: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  aboutText: string;
  socialLinks: {
    instagram: string;
    linkedin: string;
    facebook: string;
    tiktok: string;
  };
  budgetRanges: string[];
  emailNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
  legalMentions: string;
  privacyPolicy: string;
  termsOfSale: string;
}

export interface AdminStats {
  totalQuotes: number;
  pendingQuotes: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  upcomingEvents: number;
  completedEvents: number;
  totalCustomers: number;
  totalProviders: number;
  approvedProviders: number;
  confirmedRevenueMad: number;
  receivedPaymentsCount: number;
  pendingPaymentsMad: number;
  bookingsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; amountMad: number }[];
  recentActivities: {
    id: number;
    adminName: string;
    action: string;
    targetType: string;
    details: string;
    createdAt: string;
  }[];
}
