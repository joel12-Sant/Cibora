// src/lib/tenant-local.ts

const KEY = "ciboraTenantId";

/** Guarda el tenant actual del carrito en localStorage (cliente). */
export function setLocalTenantId(tenantId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (tenantId) localStorage.setItem(KEY, tenantId);
  } catch {
    // noop
  }
}

/** Lee el tenant actual del carrito desde localStorage (cliente). */
export function getLocalTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}
