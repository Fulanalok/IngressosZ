export interface TicketTypeInfo {
  name: string;
  multiplier: number;
  description: string;
  icon: string;
}

export const TICKET_TYPES: Record<string, TicketTypeInfo> = {
  standard: {
    name: "Padrão",
    multiplier: 1,
    description: "Acesso geral ao evento",
    icon: "🎫",
  },
  vip: {
    name: "VIP",
    multiplier: 2,
    description: "Acesso VIP com benefícios exclusivos",
    icon: "⭐",
  },
  premium: {
    name: "Premium",
    multiplier: 3,
    description: "Experiência premium completa",
    icon: "💎",
  },
};
