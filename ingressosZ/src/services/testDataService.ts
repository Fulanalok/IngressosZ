import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { eventService } from "./firestore";

export class TestDataService {
  static logDev(message: string, data?: unknown) {
    if (import.meta.env.DEV) {
      console.log(message, data ?? "");
    }
  }

  // Verificar se há dados de teste específicos
  static async hasTestData(): Promise<boolean> {
    try {
      const testTitles = ["Festival de Música 2024", "Stand-up Comedy Night"];
      const eventsQuery = query(
        collection(db, "events"),
        where("title", "in", testTitles),
        limit(testTitles.length)
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      const existingTitles: string[] = [];
      eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (testTitles.includes(data.title)) {
          existingTitles.push(data.title);
        }
      });

      if (import.meta.env.DEV) {
        console.log("Eventos encontrados:", existingTitles);
      }
      return existingTitles.length >= testTitles.length;
    } catch (error) {
      console.error("Erro ao verificar dados de teste:", error);
      return false;
    }
  }

  // Criar eventos de teste
  static async createTestEvents() {
    try {
      if (!auth.currentUser) {
        throw new Error("Usuário não autenticado para criar eventos de teste");
      }
      const events = [
        {
          title: "Festival de Música 2024",
          description:
            "O maior festival de música do ano com artistas nacionais e internacionais",
          date: "2024-03-15",
          time: "20:00",
          location: "Parque Ibirapuera - São Paulo",
          address: "Av. Pedro Álvares Cabral, Vila Mariana, São Paulo - SP",
          price: 150.0,
          maxTickets: 1000,
          category: "Música",
          image:
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
        },
        {
          title: "Stand-up Comedy Night",
          description:
            "Uma noite de muito humor com os melhores comediantes do país",
          date: "2024-03-20",
          time: "21:00",
          location: "Teatro Municipal - Rio de Janeiro",
          address: "Praça Floriano, Centro, Rio de Janeiro - RJ",
          price: 80.0,
          maxTickets: 500,
          category: "Comédia",
          image:
            "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500",
        },
      ];

      const eventIds = [];
      for (const event of events) {
        const eventId = await eventService.createEvent(event);
        eventIds.push(eventId);
        if (import.meta.env.DEV) {
          console.log("Evento criado:", eventId, event.title);
        }
      }

      return eventIds;
    } catch (error) {
      console.error("Erro ao criar eventos de teste:", error);
      throw error;
    }
  }

  // Inicializar dados de teste completos
  static async initializeTestData(force: boolean = false) {
    try {
      this.logDev("Iniciando criação de dados de teste...");

      if (await this.shouldSkipInitialization(force)) return;

      // Criar eventos
      this.logDev("Criando eventos de teste...");
      await this.createTestEvents();

      this.logDev("Dados de teste criados com sucesso!");
    } catch (error) {
      this.logDev("Erro ao inicializar dados de teste:", error);
      throw error;
    }
  }

  static async shouldSkipInitialization(force: boolean) {
    if (force) {
      this.logDev("Modo força ativado - recriando dados...");
      return false;
    }

    const hasData = await this.hasTestData();
    if (hasData) {
      this.logDev("Dados de teste já existem no Firestore");
      this.logDev("Use force=true para recriar os dados");
    }
    return hasData;
  }

  // Dados offline para teste quando Firebase não está disponível
  static getOfflineTestTickets() {
    return [
      {
        id: "offline-1",
        qrCode: "TICKET-1756219017406-fh2k739l1",
        status: "valid",
        eventTitle: "Festival de Música 2024",
        ticketType: "VIP",
        userEmail: "usuario1@teste.com",
        eventDate: "2024-03-15",
        eventTime: "20:00",
        price: 150.0,
      },
      {
        id: "offline-2",
        qrCode: "TICKET-JT1ZHCGOVQYIECOUAZCF",
        status: "valid",
        eventTitle: "Festival de Música 2024",
        ticketType: "Geral",
        userEmail: "usuario2@teste.com",
        eventDate: "2024-03-15",
        eventTime: "20:00",
        price: 100.0,
      },
      {
        id: "offline-3",
        qrCode: "TICKET-1756219017407-usado123",
        status: "used",
        eventTitle: "Stand-up Comedy Night",
        ticketType: "VIP",
        userEmail: "usuario3@teste.com",
        eventDate: "2024-03-20",
        eventTime: "21:00",
        price: 80.0,
      },
      {
        id: "offline-4",
        qrCode: "TICKET-1756295230187-lxfcondum",
        status: "valid",
        eventTitle: "Festival de Música 2024",
        ticketType: "Geral",
        userEmail: "usuario4@teste.com",
        eventDate: "2024-03-15",
        eventTime: "20:00",
        price: 100.0,
      },
    ];
  }

  // Validar ticket offline
  static validateOfflineTicket(qrCode: string) {
    const tickets = this.getOfflineTestTickets();
    return tickets.find((ticket) => ticket.qrCode === qrCode) || null;
  }
}
