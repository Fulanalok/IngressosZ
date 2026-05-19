export const MAX_PURCHASE_QUANTITY = 5;
const MAX_PURCHASE_QUANTITY_HARD_CAP = 50;

export const resolveMaxPerPurchase = (eventData: {
  maxPerPurchase?: number;
}): number => {
  const cfg = eventData.maxPerPurchase;
  if (
    typeof cfg === "number" &&
    Number.isInteger(cfg) &&
    cfg >= 1 &&
    cfg <= MAX_PURCHASE_QUANTITY_HARD_CAP
  ) {
    return cfg;
  }
  return MAX_PURCHASE_QUANTITY;
};
