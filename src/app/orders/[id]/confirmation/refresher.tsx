"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientStatusRefresher({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      router.refresh(); // vuelve a renderizar el server component
    };

    const iv = setInterval(tick, 3000); // cada 3s
    const to = setTimeout(() => clearInterval(iv), 30000); // 30s máximo

    return () => {
      active = false;
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [router]);

  return null;
}
