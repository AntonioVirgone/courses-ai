// Importi in centesimi interi: vedi ADR-0001.

export interface Coupon {
  code: string;
  percentOff: number;
  expiresAt: Date;
}

export function applyCoupon(subtotalCents: number, coupon: Coupon, now: Date = new Date()): number {
  // Esercizio del laboratorio: se il coupon è scaduto, lancia un errore
  // con un messaggio per il cliente. La skill italian-copy deve attivarsi da sola.
  return Math.round((subtotalCents * (100 - coupon.percentOff)) / 100);
}
