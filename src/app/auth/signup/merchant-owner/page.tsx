"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerTenantStep() {
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [imageUrl,setImageUrl]=useState("");
  const [line1,setLine1]=useState("");
  const [city,setCity]=useState("");
  const [postalCode,setPostalCode]=useState("");
  const [state,setState]=useState("");
  const [loading,setLoading]=useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try{
      const res = await fetch("/api/tenants",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name, description, imageUrl, address: { line1, city, postalCode, state, country:"MX" } }),
      });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok){ alert(data?.error || "No se pudo crear el restaurante"); return; }
      router.push("/");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-lg px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Crea tu restaurante</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm">Nombre del restaurante</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm">Descripción (opcional)</label>
              <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={3} value={description} onChange={e=>setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Imagen (URL opcional)</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Calle y número</label>
                <input className="mt-1 w-full rounded-xl border px-3 py-2" value={line1} onChange={e=>setLine1(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm">Ciudad</label>
                <input className="mt-1 w-full rounded-xl border px-3 py-2" value={city} onChange={e=>setCity(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm">Estado</label>
                <input className="mt-1 w-full rounded-xl border px-3 py-2" value={state} onChange={e=>setState(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">CP</label>
                <input className="mt-1 w-full rounded-xl border px-3 py-2" value={postalCode} onChange={e=>setPostalCode(e.target.value)} required />
              </div>
            </div>

            <button disabled={loading}
                    className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                               bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              {loading ? "Creando..." : "Crear restaurante"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
