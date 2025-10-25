"use client";
import { useEffect, useState } from "react";

type Tenant = { id: string; name: string };

export default function StaffRequestStep() {
  const [q,setQ]=useState("");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState<Tenant[]>([]);
  const [selected,setSelected]=useState<string>("");

  useEffect(()=>{
    const ctrl = new AbortController();
    (async ()=>{
      if(!q.trim()){ setResults([]); return; }
      const res = await fetch(`/api/tenants?query=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      const data = await res.json().catch(()=> ({}));
      if(res.ok) setResults(data?.tenants ?? []);
    })();
    
  },[q]);

  async function onSend() {
    if(!selected) { alert("Selecciona un restaurante"); return; }
    setLoading(true);
    try{
      const res = await fetch("/api/staff-requests", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ tenantId: selected }),
      });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok){ alert(data?.error || "No se pudo enviar la solicitud"); return; }
      alert("Solicitud enviada. El dueño recibirá un correo para aprobarte.");
      window.location.href = "/";
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-lg px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Unirme como empleado</h1>

          <div className="mt-4">
            <label className="block text-sm">Busca tu restaurante</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2" value={q} onChange={e=>setQ(e.target.value)} placeholder="Ej. Taquería El Sol" />
          </div>

          <ul className="mt-3 max-h-56 overflow-auto divide-y rounded-xl border">
            {results.map(t => (
              <li key={t.id} className="flex items-center justify-between p-3">
                <div className="font-medium">{t.name}</div>
                <button onClick={()=>setSelected(t.id)}
                        className={`rounded-full px-3 py-1 text-sm border
                          ${selected===t.id ? "bg-amber-500 text-white border-amber-500" : "hover:bg-orange-50"}`}>
                  {selected===t.id ? "Seleccionado" : "Elegir"}
                </button>
              </li>
            ))}
            {q && results.length===0 && <li className="p-3 text-sm text-zinc-600">Sin resultados</li>}
          </ul>

          <div className="pt-4">
            <button disabled={loading || !selected}
                    onClick={onSend}
                    className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                               bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60">
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
