"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientStatusRefresher({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/orders/${orderId}/sync`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.updated === true || data?.status === "PAID") {
            router.refresh();
            return;
          }
        }
      } catch {
      }

      router.refresh();
    };

    const iv = setInterval(tick, 3000); 
    const to = setTimeout(() => clearInterval(iv), 45000);

    return () => {
      active = false;
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [router, orderId]);

  return null;
}
