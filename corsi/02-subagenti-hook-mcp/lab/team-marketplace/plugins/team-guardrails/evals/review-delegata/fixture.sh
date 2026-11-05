#!/usr/bin/env bash
# Repo git con una modifica da rivedere: un messaggio in inglese e un sinonimo fuori glossario.
set -euo pipefail
git init -q . && git config user.email eval@example.com && git config user.name eval
mkdir -p packages/core/src
cat > packages/core/src/coupon.ts <<'TS'
export function applyCoupon(subtotalCents: number, percentOff: number, expired: boolean): number {
  return Math.round((subtotalCents * (100 - percentOff)) / 100);
}
TS
git add . && git commit -qm "chore: base"
cat > packages/core/src/coupon.ts <<'TS'
export function applyCoupon(subtotalCents: number, percentOff: number, expired: boolean): number {
  // controlla se l'utente ha un coupon scaduto
  if (expired) throw new Error("Coupon expired");
  return Math.round((subtotalCents * (100 - percentOff)) / 100);
}
TS
