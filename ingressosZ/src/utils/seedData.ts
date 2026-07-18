import { collection, getDocs, limit, query } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { eventService } from "../services/firestore";
import type { Event } from "../types";

// Dados de exemplo para eventos
const sampleEvents: Omit<Event, "id" | "createdAt" | "updatedAt">[] = [
  {
    title: "Show Rock Nacional",
    description:
      "Uma noite incrível com as melhores bandas do rock nacional brasileiro. Venha curtir os maiores sucessos e descobrir novos talentos!",
    date: "2025-09-15",
    time: "20:00",
    location: "Arena Rock SP",
    address: "Rua das Flores, 123 - Vila Madalena, São Paulo - SP",
    price: 85.0,
    maxTickets: 500,
    availableTickets: 450,
    category: "Música",
    organizerId: "org_001",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
  },
  {
    title: "Festival de Gastronomia",
    description:
      "Experimente os sabores únicos dos melhores chefs da cidade. Food trucks, pratos gourmet e muita diversão gastronômica!",
    date: "2025-09-22",
    time: "18:00",
    location: "Parque Ibirapuera",
    address: "Av. Paulista, 1578 - Bela Vista, São Paulo - SP",
    price: 45.0,
    maxTickets: 800,
    availableTickets: 723,
    category: "Gastronomia",
    organizerId: "org_002",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop",
  },
  {
    title: "Conferência de Tecnologia 2025",
    description:
      "O maior evento de tecnologia do ano! Palestras sobre IA, desenvolvimento web, mobile e as últimas tendências do mercado tech.",
    date: "2025-10-05",
    time: "09:00",
    location: "Centro de Convenções Anhembi",
    address: "Av. Olavo Fontoura, 1209 - Santana, São Paulo - SP",
    price: 120.0,
    maxTickets: 1000,
    availableTickets: 856,
    category: "Tecnologia",
    organizerId: "org_003",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
  },
  {
    title: "Stand-up Comedy Night",
    description:
      "Uma noite de muitas risadas com os melhores comediantes do Brasil. Humor inteligente e descontração garantida!",
    date: "2025-09-30",
    time: "21:30",
    location: "Teatro Bradesco",
    address: "Rua Palestra Itália, 500 - Perdizes, São Paulo - SP",
    price: 60.0,
    maxTickets: 300,
    availableTickets: 45,
    category: "Entretenimento",
    organizerId: "org_004",
    image:
      "https://images.unsplash.com/photo-1597213835086-048e58dd0e4a?w=800&h=600&fit=crop",
  },
  {
    title: "Workshop de Fotografia",
    description:
      "Aprenda técnicas profissionais de fotografia com fotógrafos renomados. Inclui prática ao ar livre e certificado.",
    date: "2025-10-12",
    time: "14:00",
    location: "Estúdio Photo Pro",
    address: "Rua Augusta, 987 - Consolação, São Paulo - SP",
    price: 95.0,
    maxTickets: 25,
    availableTickets: 8,
    category: "Educação",
    organizerId: "org_005",
    image:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600&fit=crop",
  },
  {
    title: "Festival de Jazz",
    description:
      "Uma celebração do jazz em todas as suas formas. Artistas locais e internacionais se reunem para uma experiência musical única.",
    date: "2025-11-18",
    time: "19:00",
    location: "Blue Note São Paulo",
    address: "Av. Paulista, 2073 - Consolação, São Paulo - SP",
    price: 75.0,
    maxTickets: 400,
    availableTickets: 0, // Evento esgotado
    category: "Música",
    organizerId: "org_006",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
  },
];

// Função para adicionar eventos de exemplo ao Firestore
export async function seedSampleEvents() {
  try {
    console.log("Adicionando eventos de exemplo ao Firestore...");
    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado para seed de eventos");
    }

    const promises = sampleEvents.map(async (eventData) => {
      return eventService.createEvent(eventData);
    });

    const results = await Promise.all(promises);
    console.log(`${results.length} eventos adicionados com sucesso!`);

    results.forEach((eventId, index) => {
      console.log(`- ${sampleEvents[index].title}: ${eventId}`);
    });

    return results;
  } catch (error) {
    console.error("Erro ao adicionar eventos de exemplo:", error);
    throw error;
  }
}

// Função para verificar se já existem eventos
export async function checkIfEventsExist() {
  try {
    const eventsQuery = query(collection(db, "events"), limit(1));
    const snapshot = await getDocs(eventsQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error("Erro ao verificar eventos existentes:", error);
    return false;
  }
}
