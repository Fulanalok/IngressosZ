import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where, } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
// =============================================================================
// Event Service
// =============================================================================
export const eventService = {
    async getEvents(pageSize, lastDoc) {
        const eventsCollection = collection(db, "events");
        let eventsQuery = query(eventsCollection, orderBy("date", "desc"), where("availableTickets", ">", 0), limit(pageSize));
        if (lastDoc) {
            eventsQuery = query(eventsQuery, startAfter(lastDoc));
        }
        const snapshot = await getDocs(eventsQuery);
        return {
            events: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            lastVisible: snapshot.docs[snapshot.docs.length - 1],
        };
    },
    async getAdminEvents() {
        const q = query(collection(db, "events"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    async getEventById(eventId) {
        const snapshot = await getDoc(doc(db, "events", eventId));
        return snapshot.exists()
            ? { id: snapshot.id, ...snapshot.data() }
            : null;
    },
    async createEvent(eventData) {
        if (!eventData.createdBy && !auth.currentUser) {
            throw new Error("Usuário não autenticado para criar evento.");
        }
        const docRef = await addDoc(collection(db, "events"), {
            ...eventData,
            createdBy: eventData.createdBy ?? auth.currentUser?.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    },
    async updateEvent(eventId, eventData) {
        await updateDoc(doc(db, "events", eventId), {
            ...eventData,
            updatedAt: serverTimestamp(),
        });
    },
    async deleteEvent(eventId) {
        await deleteDoc(doc(db, "events", eventId));
    },
    async decrementAvailableTickets(eventId, quantity) {
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
    async getUserTickets(userId) {
        const q = query(collection(db, "tickets"), where("userId", "==", userId), orderBy("purchaseDate", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    subscribeToUserTickets(userId, onUpdate, onError) {
        const q = query(collection(db, "tickets"), where("userId", "==", userId), orderBy("purchaseDate", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tickets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            onUpdate(tickets);
        }, (error) => {
            console.error("Error listening to ticket updates:", error);
            onError(error);
        });
        return unsubscribe;
    },
    async getTicketById(ticketId) {
        const snapshot = await getDoc(doc(db, "tickets", ticketId));
        return snapshot.exists()
            ? { id: snapshot.id, ...snapshot.data() }
            : null;
    },
    async getTicketForValidation(ticketId) {
        const ticketRef = doc(db, "tickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);
        if (!ticketSnap.exists()) {
            return null;
        }
        const ticket = { id: ticketSnap.id, ...ticketSnap.data() };
        const eventRef = doc(db, "events", ticket.eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
            const event = eventSnap.data();
            ticket.eventTitle = event.title;
            ticket.eventDate = event.date;
            ticket.eventLocation = event.location;
        }
        return ticket;
    },
    async markTicketAsUsed(ticketId, validatorId) {
        const ticketRef = doc(db, "tickets", ticketId);
        await updateDoc(ticketRef, {
            status: "used",
            validatedAt: serverTimestamp(),
            validatedBy: validatorId,
        });
    },
    async getAllTickets() {
        const ticketsQuery = query(collection(db, "tickets"), orderBy("purchaseDate", "desc"));
        const snapshot = await getDocs(ticketsQuery);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
};
// =============================================================================
// User Service
// =============================================================================
export const userService = {
    async getUserProfile(userId) {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    },
    async createUserProfile(userId, data) {
        await setDoc(doc(db, "users", userId), { ...data, uid: userId, createdAt: serverTimestamp() }, { merge: true });
    },
    async updateUserProfile(userId, data) {
        await updateDoc(doc(db, "users", userId), data);
    },
    onUserProfileSnapshot(userId, callback) {
        return onSnapshot(doc(db, "users", userId), (docSnap) => {
            callback(docSnap.exists() ? docSnap.data() : null);
        });
    },
};
// =============================================================================
// Payment Service (Analytics)
// =============================================================================
export const paymentService = {
    async getAllPayments() {
        const paymentsCollection = collection(db, "paymentSessions");
        const q = query(paymentsCollection, where("status", "==", "approved"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
};
