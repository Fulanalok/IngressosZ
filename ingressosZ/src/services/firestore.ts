import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import type { Event, PaymentSession, Ticket, UserProfile } from "../types";
import { postClientError } from "./logger";
let __eventsCache: { data: Event[]; ts: number } | null = null;
const __eventByIdCache = new Map<string, { data: Event; ts: number }>();
const __ttl = 5 * 60 * 1000;

// Serviços para Eventos
export const eventService = {
  // Buscar todos os eventos disponíveis
  async getEvents(): Promise<Event[]> {
    const now = Date.now();
    const cached = __eventsCache;
    if (cached && now - cached.ts < __ttl) {
      return cached.data;
    }
    const eventsCollection = collection(db, "events");
    const eventsQuery = query(eventsCollection, orderBy("date", "desc"));
    const snapshot = await getDocs(eventsQuery);
    const res = snapshot.docs
      .map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Event)
      )
      .filter((event) => event.availableTickets > 0);
    __eventsCache = { data: res, ts: now };
    return res;
  },

  // Buscar evento por ID
  async getEventById(eventId: string): Promise<Event | null> {
    const now = Date.now();
    const cached = __eventByIdCache.get(eventId);
    if (cached && now - cached.ts < __ttl) {
      return cached.data;
    }
    const eventDoc = doc(db, "events", eventId);
    const snapshot = await getDoc(eventDoc);
    if (snapshot.exists()) {
      const data = {
        id: snapshot.id,
        ...snapshot.data(),
      } as Event;
      __eventByIdCache.set(eventId, { data, ts: now });
      return data;
    }
    return null;
  },

  // Criar novo evento (apenas para organizadores)
  async createEvent(
    eventData: Omit<Event, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const eventsCollection = collection(db, "events");
    const now = new Date().toISOString();

    const docRef = await addDoc(eventsCollection, {
      ...eventData,
      createdAt: now,
      updatedAt: now,
    });

    const id = docRef.id;
    try {
      __eventByIdCache.delete(id);
      __eventsCache = null;
    } catch {
      void 0;
    }
    return id;
  },

  // Atualizar evento existente
  async updateEvent(
    eventId: string,
    eventData: Partial<Omit<Event, "id" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const eventDoc = doc(db, "events", eventId);
    await updateDoc(eventDoc, {
      ...eventData,
      updatedAt: new Date().toISOString(),
    });
    try {
      __eventByIdCache.delete(eventId);
      __eventsCache = null;
    } catch {
      void 0;
    }
  },

  // Excluir evento
  async deleteEvent(eventId: string): Promise<void> {
    const eventDoc = doc(db, "events", eventId);
    // Soft delete ou hard delete? Vamos fazer hard delete por enquanto
    // ou setar availableTickets = 0 e status = cancelled
    // Vamos usar delete físico do documento para simplificar gestão
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(eventDoc);
    try {
      __eventByIdCache.delete(eventId);
      __eventsCache = null;
    } catch {
      void 0;
    }
  },

  async decrementAvailableTickets(
    eventId: string,
    count: number
  ): Promise<void> {
    if (count <= 0) return;
    const eventDoc = doc(db, "events", eventId);
    const snapshot = await getDoc(eventDoc);
    if (!snapshot.exists()) throw new Error("Evento não encontrado");
    const data = snapshot.data() as Event;
    const available = Number(data.availableTickets || 0);
    if (available < count) throw new Error("Ingressos insuficientes");
    await updateDoc(eventDoc, {
      availableTickets: increment(-count),
      updatedAt: serverTimestamp(),
    });
    try {
      __eventByIdCache.delete(eventId);
      __eventsCache = null;
    } catch {
      void 0;
    }
  },
};

// Serviços para Ingressos
export const ticketService = {
  // Buscar ingressos do usuário
  async getUserTickets(userId: string): Promise<Ticket[]> {
    try {
      const ticketsCollection = collection(db, "tickets");
      const ticketsQuery = query(
        ticketsCollection,
        where("userId", "==", userId),
        orderBy("purchaseDate", "desc")
      );

      const snapshot = await getDocs(ticketsQuery);
      const eventCache = new Map<string, Event | null>();
      const tickets: Ticket[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const ticketData = docSnap.data() as Omit<
            Ticket,
            "id" | "eventTitle" | "eventDate" | "eventTime" | "eventLocation"
          >;
          const eventId: string = ticketData.eventId;

          let eventData = eventCache.get(eventId) ?? null;
          if (!eventCache.has(eventId)) {
            eventData = await eventService.getEventById(eventId);
            eventCache.set(eventId, eventData);
          }

          return {
            id: docSnap.id,
            ...ticketData,
            eventTitle: eventData?.title || "Evento não encontrado",
            eventDate: eventData?.date || "Data não disponível",
            eventTime: eventData?.time || "Horário não disponível",
            eventLocation: eventData?.location || "Local não disponível",
          } as Ticket;
        })
      );

      return tickets;
    } catch (error) {
      console.error("Erro ao buscar ingressos:", error);
      void postClientError({
        type: "tickets-load-error",
        message: (error as Error).message,
        route:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        ts: Date.now(),
      });
      throw new Error(
        "Falha ao carregar ingressos: " + (error as Error).message
      );
    }
  },

  // Criar novo ingresso após pagamento
  async createTicket(
    ticketData: Omit<Ticket, "id" | "purchaseDate" | "qrCode">
  ): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }
      const now = new Date().toISOString();
      const qrCode = `TICKET-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const ticketsCollection = collection(db, "tickets");
      const docRef = await addDoc(ticketsCollection, {
        ...ticketData,
        userId: currentUser.uid,
        userEmail: currentUser.email || ticketData.userEmail || "",
        purchaseDate: now,
        qrCode: qrCode,
        status: "active",
        validatedAt: null,
        validatedBy: null,
      });

      if (import.meta.env.DEV) {
        console.log("Ingresso criado:", docRef.id);
      }
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar ingresso:", error);
      void postClientError({
        type: "ticket-create-error",
        message: (error as Error).message,
        route:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        ts: Date.now(),
      });
      throw new Error("Falha ao criar ingresso: " + (error as Error).message);
    }
  },

  // Buscar ingresso por ID e QR Code (para validação)
  async getTicketForValidation(
    ticketId: string,
    qrCode: string
  ): Promise<Ticket | null> {
    try {
      const ticketDoc = doc(db, "tickets", ticketId);
      const snapshot = await getDoc(ticketDoc);

      if (snapshot.exists()) {
        const ticketData = snapshot.data();

        // Verificar se o QR Code confere
        if (ticketData.qrCode === qrCode && ticketData.status === "active") {
          // Buscar dados do evento
          const eventData = await eventService.getEventById(ticketData.eventId);

          return {
            id: snapshot.id,
            ...ticketData,
            eventTitle: eventData?.title || "Evento não encontrado",
            eventDate: eventData?.date || "Data não disponível",
            eventTime: eventData?.time || "Horário não disponível",
            eventLocation: eventData?.location || "Local não disponível",
          } as Ticket;
        }
      }
      return null;
    } catch (error) {
      console.error("Erro ao validar ingresso:", error);
      void postClientError({
        type: "ticket-validate-error",
        message: (error as Error).message,
        route:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        ts: Date.now(),
      });
      throw new Error("Falha na validação: " + (error as Error).message);
    }
  },

  // Marcar ingresso como usado
  async markTicketAsUsed(
    ticketId: string,
    validatorUserId: string
  ): Promise<void> {
    try {
      const ticketDoc = doc(db, "tickets", ticketId);
      await updateDoc(ticketDoc, {
        status: "used",
        validatedAt: new Date().toISOString(),
        validatedBy: validatorUserId,
      });

      if (import.meta.env.DEV) {
        console.log("Ingresso marcado como usado:", ticketId);
      }
    } catch (error) {
      console.error("Erro ao marcar ingresso como usado:", error);
      void postClientError({
        type: "ticket-mark-used-error",
        message: (error as Error).message,
        route:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        ts: Date.now(),
      });
      throw new Error("Falha ao marcar ingresso: " + (error as Error).message);
    }
  },

  // Buscar ingresso por QR Code apenas
  async getTicketByQRCode(qrCode: string): Promise<Ticket | null> {
    try {
      const ticketsCollection = collection(db, "tickets");
      const q = query(ticketsCollection, where("qrCode", "==", qrCode));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const ticketData = doc.data();

        // Buscar dados do evento
        const eventData = await eventService.getEventById(ticketData.eventId);

        return {
          id: doc.id,
          ...ticketData,
          eventTitle: eventData?.title || "Evento não encontrado",
          eventDate: eventData?.date || "Data não disponível",
          eventTime: eventData?.time || "Horário não disponível",
          eventLocation: eventData?.location || "Local não disponível",
        } as Ticket;
      }

      return null;
    } catch (error) {
      console.error("Erro ao buscar ingresso por QR:", error);
      void postClientError({
        type: "ticket-by-qr-error",
        message: (error as Error).message,
        route:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        ts: Date.now(),
      });
      throw new Error("Falha ao buscar ingresso: " + (error as Error).message);
    }
  },
};

// Serviços para Perfil do Usuário
export const userService = {
  // Criar perfil do usuário
  async createUserProfile(userProfile: UserProfile): Promise<void> {
    const userDoc = doc(db, "users", userProfile.uid);
    await setDoc(userDoc, userProfile);
  },

  // Buscar perfil do usuário
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = doc(db, "users", uid);
    const snapshot = await getDoc(userDoc);

    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
    return null;
  },

  async updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
  ): Promise<void> {
    const userDoc = doc(db, "users", uid);
    await updateDoc(userDoc, data);
  },
};

// Serviços para Sessões de Pagamento
export const paymentService = {
  // Criar sessão de pagamento
  async createPaymentSession(
    sessionData: Omit<PaymentSession, "id" | "createdAt">
  ): Promise<string> {
    const paymentsCollection = collection(db, "payment_sessions");

    const docRef = await addDoc(paymentsCollection, {
      ...sessionData,
      createdAt: new Date().toISOString(),
    });

    return docRef.id;
  },

  // Atualizar status da sessão de pagamento
  async updatePaymentSession(
    sessionId: string,
    updates: Partial<PaymentSession>
  ): Promise<void> {
    const sessionDoc = doc(db, "payment_sessions", sessionId);
    await updateDoc(sessionDoc, updates);
  },
};
