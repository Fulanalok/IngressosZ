
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig'; // Ajuste o caminho se necessário

// INICIALIZAÇÃO DO FIREBASE
// NOTA: Em um ambiente real, você não colocaria a configuração diretamente no código.
// Mas para um script de seeding, isso é aceitável.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DADOS DE EXEMPLO
const sampleEvents = [
  {
    name: 'Festival de Rock Clássico',
    date: '2024-10-26T20:00:00.000Z',
    location: 'Estádio do Morumbi, São Paulo',
    description: 'Uma noite inesquecível com as maiores bandas de rock clássico do mundo.',
    imageUrl: '/placeholder-1.jpg', // Use imagens do Pexels ou Unsplash
    availableTickets: 5000,
    ticketPrice: 250,
  },
  {
    name: 'Show Acústico - Voz e Violão',
    date: '2024-11-15T21:00:00.000Z',
    location: 'Teatro Municipal, Rio de Janeiro',
    description: 'Um show intimista com grandes nomes da MPB.',
    imageUrl: '/placeholder-2.jpg',
    availableTickets: 800,
    ticketPrice: 150,
  },
  {
    name: 'Convenção de Tecnologia e Inovação',
    date: '2024-12-05T09:00:00.000Z',
    location: 'Centro de Convenções, Curitiba',
    description: 'Palestras e workshops com os maiores especialistas em tecnologia do Brasil.',
    imageUrl: '/placeholder-3.jpg',
    availableTickets: 2000,
    ticketPrice: 500,
  },
  {
    name: 'Exposição de Arte Moderna',
    date: '2025-01-20T10:00:00.000Z',
    location: 'MASP, São Paulo',
    description: 'Obras de artistas renomados do século XX.',
    imageUrl: '/placeholder-4.jpg',
    availableTickets: 1500,
    ticketPrice: 100,
  }
];

// FUNÇÃO PARA POPULAR O FIRESTORE
async function seedEvents() {
  const eventsCollection = collection(db, 'events');
  console.log('Iniciando o seeding de eventos...');

  for (const eventData of sampleEvents) {
    try {
      await addDoc(eventsCollection, {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`Evento "${eventData.name}" adicionado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao adicionar o evento "${eventData.name}":`, error);
    }
  }

  console.log('Seeding de eventos concluído!');
}

// EXECUTA O SCRIPT
seedEvents().then(() => {
  console.log('Processo finalizado.');
  // O processo não será encerrado automaticamente. Pressione Ctrl+C para sair.
}).catch(error => {
  console.error('Ocorreu um erro durante o seeding:', error);
});

