"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourierStep() {
  const [vehicle, setVehicle] = useState<"MOTORCYCLE"|"CAR">("MOTORCYCLE");
  const [loading,setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try{
      const res = await fetch("/api/profile/courier",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ vehicleType: vehicle }),
      });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok){ alert(data?.error || "No se pudo guardar"); return; }
      router.push("/");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-lg px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Tu vehículo</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "MOTORCYCLE", label: "Motocicleta" },
                { val: "CAR", label: "Auto" },
              ].map(opt => (
                <label key={opt.val}
                  className={`rounded-2xl border px-3 py-2 text-sm cursor-pointer transition
                    ${vehicle===opt.val ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                  <input type="radio" name="veh" className="mr-2"
                         checked={vehicle===opt.val} onChange={()=>setVehicle(opt.val as any)} />
                  {opt.label}
                </label>
              ))}
            </div>

            <button disabled={loading}
                    className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
                               bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              {loading ? "Guardando..." : "Continuar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
