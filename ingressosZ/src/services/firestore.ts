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
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebaseConfig";
import type {
  Event,
  PaginatedEvents,
  PaymentSession,
  Purchase,
  Ticket,
  UserProfile,
} from "../types";

// =============================================================================
// Event Service
// =============================================================================
export const adminService = {
  async getDashboardStats() {
    // Nota: Em produção, usar aggregation queries ou contadores distribuídos
    const ticketsRef = collection(db, "tickets");
    const snapshot = await getDocs(ticketsRef);
    const tickets = snapshot.docs.map((doc) => doc.data() as Ticket);

    const totalRevenue = tickets.reduce((acc, t) => {
      return t.status !== "cancelled" ? acc + (t.price || 0) : acc;
    }, 0);

    const ticketsSold = tickets.filter((t) => t.status !== "cancelled").length;
    const ticketsUsed = tickets.filter((t) => t.status === "used").length;

    const salesByDateMap = tickets.reduce((acc, t) => {
      if (t.status === "cancelled" || !t.purchaseDate) return acc;
      const date = t.purchaseDate.split("T")[0]; // YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = { date, amount: 0, tickets: 0 };
      }
      acc[date].amount += t.price || 0;
      acc[date].tickets += 1;
      return acc;
    }, {} as Record<string, { date: string; amount: number; tickets: number }>);

    const salesByDate = Object.values(salesByDateMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const ticketsByStatus = [
      {
        name: "Ativos",
        value: tickets.filter((t) => t.status === "active").length,
        fill: "#3b82f6",
      },
      {
        name: "Usados",
        value: tickets.filter((t) => t.status === "used").length,
        fill: "#22c55e",
      },
      {
        name: "Cancelados",
        value: tickets.filter((t) => t.status === "cancelled").length,
        fill: "#ef4444",
      },
    ];

    return {
      totalRevenue,
      ticketsSold,
      ticketsUsed,
      salesByDate,
      ticketsByStatus,
    };
  },
};

export const eventService = {
  async getEvents(
    pageSize: number,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<PaginatedEvents> {
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
      events: snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Event)
      ),
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
    return snapshot.exists()
      ? ({ id: snapshot.id, ...snapshot.data() } as Event)
      : null;
  },

  async createEvent(
    eventData: Omit<Event, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const docRef = await addDoc(collection(db, "events"), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async updateEvent(
    eventId: string,
    eventData: Partial<Omit<Event, "id">>
  ): Promise<void> {
    await updateDoc(doc(db, "events", eventId), {
      ...eventData,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    await deleteDoc(doc(db, "events", eventId));
  },

  async decrementAvailableTickets(
    eventId: string,
    quantity: number
  ): Promise<void> {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      availableTickets: increment(-quantity),
    });
  },
};

// =============================================================================
// Ticket Service
// =============================================================================
export const ticketService = {
  async getUserTickets(userId: string): Promise<Ticket[]> {
    const q = query(
      collection(db, "tickets"),
      where("userId", "==", userId),
      orderBy("purchaseDate", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
  },

  async getTicketById(ticketId: string): Promise<Ticket | null> {
    const snapshot = await getDoc(doc(db, "tickets", ticketId));
    return snapshot.exists()
      ? ({ id: snapshot.id, ...snapshot.data() } as Ticket)
      : null;
  },

  // Adicionar subscrição em tempo real
  subscribeToUserTickets(
    userId: string,
    onSuccess: (tickets: Ticket[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, "tickets"),
      where("userId", "==", userId),
      orderBy("purchaseDate", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const tickets = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Ticket)
        );
        onSuccess(tickets);
      },
      (error) => onError(error)
    );
  },

  async createTicket(
    ticketData: Omit<Ticket, "id" | "purchaseDate" | "qrCode">
  ): Promise<string> {
    const docRef = await addDoc(collection(db, "tickets"), {
      ...ticketData,
      purchaseDate: new Date().toISOString(),
      qrCode: self.crypto.randomUUID(),
      status: "active",
    });
    return docRef.id;
  },

  async getTicketForValidation(
    ticketId: string,
    qrCode: string
  ): Promise<Ticket | null> {
    const docSnap = await getDoc(doc(db, "tickets", ticketId));
    if (!docSnap.exists()) return null;

    const ticket = { id: docSnap.id, ...docSnap.data() } as Ticket;
    if (ticket.qrCode !== qrCode) return null;

    return ticket;
  },

  async markTicketAsUsed(
    ticketId: string,
    validatorUserId: string
  ): Promise<void> {
    await updateDoc(doc(db, "tickets", ticketId), {
      status: "used",
      validatedAt: new Date().toISOString(),
      validatedBy: validatorUserId,
    });
  },

  // Nova função para buscar todos os ingressos
  async getAllTickets(): Promise<Ticket[]> {
    const ticketsQuery = query(
      collection(db, "tickets"),
      orderBy("purchaseDate", "desc")
    );
    const snapshot = await getDocs(ticketsQuery);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
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

  createUserProfile(
    userId: string,
    data: Omit<UserProfile, "id">
  ): Promise<void> {
    return setDoc(doc(db, "users", userId), data, { merge: true });
  },

  onUserProfileSnapshot(
    userId: string,
    callback: (profile: UserProfile | null) => void
  ): () => void {
    return onSnapshot(doc(db, "users", userId), (docSnap) => {
      callback(docSnap.exists() ? (docSnap.data() as UserProfile) : null);
    });
  },

  async updateUserProfile(
    userId: string,
    data: Partial<Omit<UserProfile, "id" | "uid">>
  ): Promise<void> {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },
};

// =============================================================================
// Purchase Service (Orders & Payments)
// =============================================================================
export const purchaseService = {
  async getAllPurchases(): Promise<Purchase[]> {
    const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Purchase));
  },

  async refundPurchase(paymentId: string): Promise<any> {
    if (!functions) throw new Error("Firebase Functions não inicializado");
    const refundFn = httpsCallable(functions, "refundPayment");
    const result = await refundFn({ paymentId });
    return result.data;
  },
};

// =============================================================================
// Payment Service (Analytics - Deprecated/Legacy)
// =============================================================================
export const paymentService = {
  // Nova função para buscar todos os pagamentos aprovados
  async getAllPayments(): Promise<PaymentSession[]> {
    const paymentsCollection = collection(db, "paymentSessions");
    const q = query(
      paymentsCollection,
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as PaymentSession)
    );
  },
};
