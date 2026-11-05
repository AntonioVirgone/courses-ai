// Importi in centesimi interi: vedi ADR-0001.

export interface CartItem {
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export function subtotalCents(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function totalCents(items: CartItem[], shippingCents: number): number {
  return subtotalCents(items) + shippingCents;
}
