import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import type { Event, PaginatedEvents, PaymentSession, Ticket, UserProfile } from "../types";

// =============================================================================
// Event Service
// =============================================================================
export const eventService = {
  async getEvents(pageSize: number, lastDoc?: QueryDocumentSnapshot): Promise<PaginatedEvents> {
    const eventsCollection = collection(db, "events");
    let eventsQuery = query(
      eventsCollection,
      orderBy("date", "desc"),
      where("availableTickets", ">", 0),
      limit(pageSize)
    );
    if (lastDoc) {
      eventsQuery = query(eventsQuery, startAfter(lastDoc));
    }
    const snapshot = await getDocs(eventsQuery);
    return {
      events: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Event)),
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
    };
  },

  async getAdminEvents(): Promise<Event[]> {
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Event));
  },

  async getEventById(eventId: string): Promise<Event | null> {
    const snapshot = await getDoc(doc(db, "events", eventId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Event : null;
  },

  async createEvent(eventData: Omit<Event, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "events"), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async updateEvent(eventId: string, eventData: Partial<Omit<Event, "id">>): Promise<void> {
    await updateDoc(doc(db, "events", eventId), { ...eventData, updatedAt: serverTimestamp() });
  },

  async deleteEvent(eventId: string): Promise<void> {
    await deleteDoc(doc(db, "events", eventId));
  },
};

// =============================================================================
// Ticket Service
// =============================================================================
export const ticketService = {
  async getUserTickets(userId: string): Promise<Ticket[]> {
    const q = query(collection(db, "tickets"), where("userId", "==", userId), orderBy("purchaseDate", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
  },
  
  async getTicketById(ticketId: string): Promise<Ticket | null> {
    const snapshot = await getDoc(doc(db, "tickets", ticketId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Ticket : null;
  },

  // Nova função para buscar todos os ingressos
  async getAllTickets(): Promise<Ticket[]> {
    const ticketsQuery = query(collection(db, "tickets"), orderBy("purchaseDate", "desc"));
    const snapshot = await getDocs(ticketsQuery);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
  },
};

// =============================================================================
// User Service
// =============================================================================
export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  },

  createUserProfile(userId: string, data: Omit<UserProfile, 'id'>): Promise<void> {
    return setDoc(doc(db, "users", userId), data, { merge: true });
  },

  onUserProfileSnapshot(userId: string, callback: (profile: UserProfile | null) => void): () => void {
    return onSnapshot(doc(db, "users", userId), (docSnap) => {
      callback(docSnap.exists() ? (docSnap.data() as UserProfile) : null);
    });
  },
};


// =============================================================================
// Payment Service (Analytics)
// =============================================================================
export const paymentService = {
  // Nova função para buscar todos os pagamentos aprovados
  async getAllPayments(): Promise<PaymentSession[]> {
    const paymentsCollection = collection(db, "paymentSessions");
    const q = query(paymentsCollection, where("status", "==", "approved"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PaymentSession));
  },
};
