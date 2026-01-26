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
  phone?: string;
  createdAt: string;
  role: "user" | "organizer" | "validator";
}

// Tipos para Pagamento
export interface PaymentSession {
  id: string;
  eventId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  paymentId?: string;
  provider?: "mercadopago";
  createdAt: string;
  completedAt?: string;
}

// Tipos para o contexto de autenticação
export interface AuthContextType {
  user: import("firebase/auth").User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getFreshIdToken: () => Promise<string | null>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

// Tipos para APIs/Cloud Functions
export interface ValidateTicketRequest {
  ticketId: string;
  qrCode: string;
}

export interface ValidateTicketResponse {
  success: boolean;
  message: string;
  ticket?: Ticket;
  event?: Event;
}

export interface CreateCheckoutSessionRequest {
  eventId: string;
  ticketType: string;
  quantity: number;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}
