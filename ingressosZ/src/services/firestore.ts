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
import { db } from "../firebaseConfig";
import type { Event, PaginatedEvents, PaymentSession, Ticket, UserProfile } from "../types";

// =============================================================================
// Event Service
// =============================================================================
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

  async decrementAvailableTickets(eventId: string, quantity: number): Promise<void> {
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

  subscribeToUserTickets(
    userId: string,
    onUpdate: (tickets: Ticket[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, "tickets"),
      where("userId", "==", userId),
      orderBy("purchaseDate", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tickets = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Ticket)
        );
        onUpdate(tickets);
      },
      (error) => {
        console.error("Error listening to ticket updates:", error);
        onError(error);
      }
    );

    return unsubscribe;
  },

  async getTicketById(ticketId: string): Promise<Ticket | null> {
    const snapshot = await getDoc(doc(db, "tickets", ticketId));
    return snapshot.exists()
      ? ({ id: snapshot.id, ...snapshot.data() } as Ticket)
      : null;
  },

  async createTicket(ticketData: Omit<Ticket, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "tickets"), ticketData);
    return docRef.id;
  },

  async getTicketForValidation(ticketId: string): Promise<Ticket | null> {
    const ticketRef = doc(db, "tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      return null;
    }

    const ticket = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;

    const eventRef = doc(db, "events", ticket.eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      const event = eventSnap.data() as Event;
      ticket.eventTitle = event.title;
      ticket.eventDate = event.date;
      ticket.eventLocation = event.location;
    }

    return ticket;
  },

  async markTicketAsUsed(ticketId: string, validatorId: string): Promise<void> {
    const ticketRef = doc(db, "tickets", ticketId);
    await updateDoc(ticketRef, {
      status: "used",
      validatedAt: serverTimestamp(),
      validatedBy: validatorId,
    });
  },

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

  async createUserProfile(
    userId: string,
    data: Omit<UserProfile, "uid" | "createdAt">
  ): Promise<void> {
    await setDoc(
      doc(db, "users", userId),
      { ...data, uid: userId, createdAt: serverTimestamp() },
      { merge: true }
    );
  },

  async updateUserProfile(
    userId: string,
    data: Partial<Omit<UserProfile, "uid">>
  ): Promise<void> {
    await updateDoc(doc(db, "users", userId), data);
  },

  onUserProfileSnapshot(
    userId: string,
    callback: (profile: UserProfile | null) => void
  ): () => void {
    return onSnapshot(doc(db, "users", userId), (docSnap) => {
      callback(docSnap.exists() ? (docSnap.data() as UserProfile) : null);
    });
  },
};

// =============================================================================
// Payment Service (Analytics)
// =============================================================================
export const paymentService = {
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
