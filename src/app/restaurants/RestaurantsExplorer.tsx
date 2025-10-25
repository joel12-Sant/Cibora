"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Restaurant = { id: string; name: string; description: string; imageURL: string };

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isSubsequence(q: string, t: string) {
  const qq = norm(q).replace(/\s+/g, "");
  const tt = norm(t);
  if (!qq) return true;
  let i = 0;
  for (let k = 0; k < tt.length && i < qq.length; k++) {
    if (tt[k] === qq[i]) i++;
  }
  return i === qq.length;
}

export default function RestaurantsExplorer({ restaurants }: { restaurants: Restaurant[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (q) params.set("q", q);
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  const filtered = useMemo(
    () => restaurants.filter((r) => isSubsequence(q, r.name)),
    [restaurants, q]
  );

  return (
    <>
      <div className="mt-4">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400"
            aria-hidden="true"
          >
            <path
              d="M11 18a7 7 0 1 1 4.95-2.05L21 21"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Busca tu restaurante favorito'
            className="w-full rounded-full border border-amber-200 bg-white pl-10 pr-28 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Buscar restaurantes por nombre"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="rounded-full px-3 py-1 text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                aria-label="Limpiar búsqueda"
              >
                Limpiar
              </button>
            ) : null}
            <span className="rounded-full px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-600">
              {filtered.length}
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <li key={r.id}>
            <article className="group h-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md focus-within:shadow-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                {r.imageURL ? (
                  <Image
                    src={r.imageURL}
                    alt={`Foto de ${r.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
              </div>

              <div className="p-4">
                <header>
                  <h2 className="text-base font-semibold leading-tight text-zinc-900">{r.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                    {r.description}
                  </p>
                </header>

                <div className="mt-3">
                  <Link
                    href={`/restaurants/${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
                  >
                    Ver menú
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M9 18l6-6-6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-8 text-sm text-zinc-600">No encontramos restaurantes que coincidan con la busqueda.</p>
      )}
    </>
  );
}
