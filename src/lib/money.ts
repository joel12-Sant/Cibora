// src/lib/money.ts
const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** Tu DB almacena montos en PESOS enteros (e.g., 640 = $640.00). */
export function formatMXN(dbPesos: number): string {
  return fmt.format(dbPesos);
}

/** Convierte DB (pesos) a centavos para Stripe. */
export function toStripeAmount(dbPesos: number): number {
  return Math.round(dbPesos * 100);
}

/** Por si algún día hay que mostrar centavos de Stripe en la UI. */
export function fromStripeAmount(cents: number): number {
  return Math.round(cents) / 100;
}
