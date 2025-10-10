"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientStatusRefresher() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      router.refresh();
    };

    const iv = setInterval(tick, 3000);
    const to = setTimeout(() => clearInterval(iv), 30000);

    return () => {
      active = false;
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [router]);

  return null;
}
