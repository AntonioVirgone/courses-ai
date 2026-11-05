---
alert: ACME-101
version: 2
---
# Piano v2 · ACME-101

## Diagnosi

`applyCoupon` in `packages/core/src/coupon.ts` riceve `now` ma non lo confronta con `coupon.expiresAt`. Un coupon scaduto applica lo sconto.

## Modifiche

1. In `applyCoupon`, prima del calcolo: `if (now.getTime() > coupon.expiresAt.getTime()) throw new Error(`Il coupon ${coupon.code} è scaduto: toglilo dal carrello e riprova.`);`
2. Aggiungere `packages/core/src/coupon.test.ts` con un caso per il coupon valido e uno per il coupon scaduto.

## File toccati

- `packages/core/src/coupon.ts`
- `packages/core/src/coupon.test.ts` (nuovo)

## Dipendenze

Nessuna.

## Rischi

- Chi chiama `applyCoupon` con un coupon scaduto ora riceve un errore. In `packages/core` non ci sono altri chiamanti.

## Risposta al verdetto v1

- **Nessuna dipendenza nuova:** niente `date-fns`. Il confronto usa `getTime()` delle due date.
- **Perimetro:** `package.json` non si tocca più. Restano `coupon.ts` e il suo test nuovo.
- **Testi in italiano:** il messaggio è in italiano e usa «coupon» e «carrello» di `CONTEXT.md`.
