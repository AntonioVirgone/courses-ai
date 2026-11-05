---
alert: ACME-101
version: 1
---
# Piano v1 · ACME-101

## Diagnosi

`applyCoupon` in `packages/core/src/coupon.ts` riceve `now` ma non lo confronta con `coupon.expiresAt`. Un coupon scaduto applica lo sconto.

## Modifiche

1. Installare `date-fns` in `packages/core`.
2. In `applyCoupon`, prima del calcolo: `if (isAfter(now, coupon.expiresAt)) throw new Error("Coupon expired");`
3. Aggiungere `packages/core/src/coupon.test.ts` con un caso per il coupon valido e uno per il coupon scaduto.

## File toccati

- `packages/core/src/coupon.ts`
- `packages/core/src/coupon.test.ts` (nuovo)
- `packages/core/package.json`

## Dipendenze

- `date-fns`, per `isAfter`.

## Rischi

- Chi chiama `applyCoupon` con un coupon scaduto ora riceve un errore: va gestito nel carrello.
