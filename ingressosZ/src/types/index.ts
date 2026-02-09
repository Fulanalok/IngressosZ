// Tipos para Eventos
export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: number;
  maxTickets: number;
  availableTickets: number;
  inventory?: Record<string, number>;
  pricing?: Record<string, number>;
  image?: string;
  category: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEvents {
  events: Event[];
  lastVisible: any;
}

// Tipos para Ingressos
export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  purchaseDate: string;
  qrCode: string;
  status: "active" | "used" | "cancelled";
  price: number;
  ticketType: "standard" | "vip" | "premium";
  validatedAt?: string;
  validatedBy?: string;
  // Campos adicionais do evento (calculados)
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
}

// Tipos para Usuários (dados adicionais além do Firebase Auth)
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  createdAt: string;
  role: "user" | "organizer" | "validator";
}

export interface Purchase {
  id: string;
  userId: string;
  eventId: string;
  paymentId: string;
  status: "approved" | "refunded" | "cancelled" | "pending";
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  createdAt: any;
  totalAmount?: number; // Calculado no front ou salvo no banco
}

// Tipos para Pagamento (Legado/Compatibilidade)
export interface PaymentSession {
  id: string;
  eventId: string;
  userId: string;
  ticketType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: "pending" | "approved" | "failed" | "cancelled";
  paymentId?: string;
  provider?: "mercadopago";
  createdAt: { seconds: number; nanoseconds: number } | string; // Suporta Timestamp do Firestore e string ISO
  completedAt?: string;
}

// Tipos para o contexto de autenticação
export interface AuthContextType {
  user: any; // User from firebase/auth
  loading: boolean;
  isAdmin: boolean;
}
