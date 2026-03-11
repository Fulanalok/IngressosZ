import { collection, addDoc, getDocs, query } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export class TestDataService {
  // Verificar se há dados de teste específicos
  static async hasTestData(): Promise<boolean> {
    try {
      const eventsQuery = query(collection(db, "events"));
      const eventsSnapshot = await getDocs(eventsQuery);

      const testTitles = [
        "Festival de Música 2024",
        "Stand-up Comedy Night",
      ];

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
          price: 150.0,
          availableTickets: 1000,
          totalTickets: 1000,
          category: "Música",
          imageUrl:
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
          organizerId: "test-organizer",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          title: "Stand-up Comedy Night",
          description:
            "Uma noite de muito humor com os melhores comediantes do país",
          date: "2024-03-20",
          time: "21:00",
          location: "Teatro Municipal - Rio de Janeiro",
          price: 80.0,
          availableTickets: 500,
          totalTickets: 500,
          category: "Comédia",
          imageUrl:
            "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500",
          organizerId: "test-organizer",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const eventIds = [];
      for (const event of events) {
        const docRef = await addDoc(collection(db, "events"), {
          ...event,
          createdBy: auth.currentUser!.uid,
        });
        eventIds.push(docRef.id);
        if (import.meta.env.DEV) {
          console.log("Evento criado:", docRef.id, event.title);
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
      if (import.meta.env.DEV) {
        console.log("🚀 Iniciando criação de dados de teste...");
      }

      // Verificar se já há dados (apenas se não for forçado)
      if (!force) {
        const hasData = await this.hasTestData();
        if (hasData) {
          if (import.meta.env.DEV) {
            console.log("✅ Dados de teste já existem no Firestore");
            console.log("💡 Use force=true para recriar os dados");
          }
          return;
        }
      } else {
        if (import.meta.env.DEV) {
          console.log("🔄 Modo força ativado - recriando dados...");
        }
      }

      // Criar eventos
      if (import.meta.env.DEV) {
        console.log("📅 Criando eventos de teste...");
      }
      await this.createTestEvents();

      if (import.meta.env.DEV) {
        console.log("✅ Dados de teste criados com sucesso!");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log("❌ Erro ao inicializar dados de teste:", error);
      }
      throw error;
    }
  }

  // Dados offline para teste quando Firebase não está disponível
  static getOfflineTestTickets() {
    return [
      {
        id: "offline-1",
        qrCode: "TICKET-1756219017406-fh2k739l1",
        status: "active",
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
        status: "active",
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
        status: "active",
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
