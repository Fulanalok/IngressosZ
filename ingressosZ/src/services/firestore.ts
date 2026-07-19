import {
  collection,
  doc,
  getDoc,
  getDocs,
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
  Ticket,
  UserProfile,
} from "../types";

// =============================================================================
// Event Service
// =============================================================================
export type CreateEventData = Omit<
  Event,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "availableTickets"
  | "organizerId"
  | "createdBy"
>;

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
    eventData: CreateEventData
  ): Promise<string> {
    const {
      availableTickets: _availableTickets,
      createdBy: _createdBy,
      organizerId: _organizerId,
      ...payload
    } = eventData as CreateEventData &
      Partial<
        Pick<Event, "availableTickets" | "createdBy" | "organizerId">
      >;
    const callable = httpsCallable<typeof payload, { eventId: string }>(
      functions,
      "createEvent"
    );
    const result = await callable(payload);
    return result.data.eventId;
  },

  async updateEvent(
    eventId: string,
    eventData: Partial<
      Pick<
        Event,
        | "title"
        | "description"
        | "date"
        | "time"
        | "location"
        | "address"
        | "image"
        | "category"
      >
    >
  ): Promise<void> {
    const callable = httpsCallable(functions, "updateEvent");
    await callable({ eventId, changes: eventData });
  },

  async deleteEvent(eventId: string): Promise<void> {
    const callable = httpsCallable(functions, "deleteEvent");
    await callable({ eventId });
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

  async getTicketsByEvent(eventId: string): Promise<Ticket[]> {
    const q = query(
      collection(db, "tickets"),
      where("eventId", "==", eventId),
      orderBy("purchaseDate", "desc")
    );
    const snapshot = await getDocs(q);
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
    data: Partial<Omit<UserProfile, "uid" | "createdAt" | "role">>
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

  async searchUserByEmail(email: string): Promise<UserProfile | null> {
    const q = query(
      collection(db, "users"),
      where("email", "==", email.trim().toLowerCase()),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return {
      uid: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as UserProfile;
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

  async getPaymentsByEvent(eventId: string): Promise<PaymentSession[]> {
    const q = query(
      collection(db, "paymentSessions"),
      where("eventId", "==", eventId),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as PaymentSession)
    );
  },

  subscribeToAllPayments(
    onUpdate: (payments: PaymentSession[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, "paymentSessions"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentSession)));
      },
      (error) => {
        console.error("Error listening to payments:", error);
        onError(error);
      }
    );
  },
};

export const adminRealtimeService = {
  subscribeToAdminEvents(
    onUpdate: (events: Event[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
      },
      (error) => {
        console.error("Error listening to events:", error);
        onError(error);
      }
    );
  },

  subscribeToOrganizerEvents(
    organizerId: string,
    onUpdate: (events: Event[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, "events"),
      where("organizerId", "==", organizerId),
      orderBy("date", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
      },
      onError
    );
  },

  subscribeToAllTickets(
    onUpdate: (tickets: Ticket[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const q = query(collection(db, "tickets"), orderBy("purchaseDate", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket)));
      },
      (error) => {
        console.error("Error listening to tickets:", error);
        onError(error);
      }
    );
  },
};
