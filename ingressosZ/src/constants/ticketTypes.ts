export interface TicketTypeInfo {
  name: string;
  description: string;
  icon: string;
}

export const TICKET_TYPES: Record<string, TicketTypeInfo> = {
  standard: {
    name: "Padrão",
    description: "Acesso geral ao evento",
    icon: "",
  },
  vip: {
    name: "VIP",
    description: "Acesso VIP com benefícios exclusivos",
    icon: "⭐",
  },
  premium: {
    name: "Premium",
    description: "Experiência premium completa",
    icon: "",
  },
};
