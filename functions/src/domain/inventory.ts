export type EventInventorySnapshot = {
  availableTickets?: number;
  inventory?: Record<string, number>;
  price?: number;
  pricing?: Record<string, number>;
};

export type SaleInventoryPlan = {
  oversold: boolean;
  currentStock: number;
  currentTypeStock: number;
  unitPrice: number;
  nextAvailableTickets?: number;
  nextTypeStock?: number;
};

/**
 * Calculates the inventory state for a ticket sale without mutating Firestore.
 *
 * @param {EventInventorySnapshot} data Event inventory snapshot read from
 * Firestore.
 * @param {string} ticketType Ticket type selected for the sale.
 * @param {number} quantity Number of tickets being sold.
 * @return {SaleInventoryPlan} Sale validation details and next inventory
 * values when valid.
 */
export function planSaleInventoryUpdate(
  data: EventInventorySnapshot,
  ticketType: string,
  quantity: number
): SaleInventoryPlan {
  const currentStock = data.availableTickets ?? 0;
  const currentTypeStock = data.inventory?.[ticketType] ?? currentStock;
  const unitPrice = Number(data.pricing?.[ticketType] ?? data.price ?? 0);
  const oversold = currentStock < quantity || currentTypeStock < quantity;

  if (oversold) {
    return {
      oversold,
      currentStock,
      currentTypeStock,
      unitPrice,
    };
  }

  return {
    oversold,
    currentStock,
    currentTypeStock,
    unitPrice,
    nextAvailableTickets: currentStock - quantity,
    nextTypeStock:
      data.inventory?.[ticketType] === undefined ?
        undefined :
        currentTypeStock - quantity,
  };
}
