"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

function toISO(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default function OrdersFilter() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState<string>(sp.get("q") ?? "");
  const [from, setFrom] = useState<string>(sp.get("from") ?? "");
  const [to, setTo] = useState<string>(sp.get("to") ?? "");

  const currentStatus = sp.get("status") ?? undefined;

  const makeUrl = useCallback(
    (extra: Record<string, string | undefined>) => {
      const base = new URL("/dashboard", window.location.origin);
      const params = new URLSearchParams(sp.toString());

      if (currentStatus) params.set("status", currentStatus);

      if (q) params.set("q", q); else params.delete("q");
      if (from) params.set("from", from); else params.delete("from");
      if (to) params.set("to", to); else params.delete("to");

      for (const [k, v] of Object.entries(extra)) {
        if (v === undefined) params.delete(k);
        else params.set(k, v);
      }

      base.search = params.toString();
      return base.pathname + "?" + base.searchParams.toString();
    },
    [sp, q, from, to, currentStatus],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      router.push(makeUrl({}));
    },
    [router, makeUrl],
  );

  const onClear = useCallback(() => {
    setQ("");
    setFrom("");
    setTo("");
    router.push(makeUrl({ q: undefined, from: undefined, to: undefined }));
  }, [router, makeUrl]);

  const disabled = useMemo(
    () => q === "" && from === "" && to === "",
    [q, from, to],
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-2 rounded-xl border p-3 md:grid-cols-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar (ID, email, ítem)"
        className="rounded-md border px-2 py-1 text-sm md:col-span-2"
      />
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        max={toISO(new Date())}
        className="rounded-md border px-2 py-1 text-sm"
        aria-label="Desde"
      />
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        max={toISO(new Date())}
        className="rounded-md border px-2 py-1 text-sm"
        aria-label="Hasta"
      />

      <div className="flex gap-2 md:col-span-4">
        <button type="submit" className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50">
          Aplicar
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
