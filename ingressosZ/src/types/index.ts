// Tipos para Eventos
import { QueryDocumentSnapshot, Timestamp } from "firebase/firestore";

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
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Tipos para Ingressos
export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  purchaseDate: Timestamp;
  qrCode: string;
  status: "active" | "valid" | "used" | "cancelled";
  price: number;
  ticketType: "standard" | "vip" | "premium";
  validatedAt?: Timestamp;
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
  createdAt: Timestamp;
  role: "user" | "organizer" | "validator" | "admin";
  avatarUrl?: string;
}

// Tipos para Pagamento
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
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface PaginatedEvents {
  events: Event[];
  lastVisible: QueryDocumentSnapshot | undefined;
}
