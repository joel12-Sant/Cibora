"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Props = {
  className?: string;
  callbackUrl?: string;
  children?: React.ReactNode;
};

export default function SignOutButton({
  className,
  callbackUrl = "/",
  children = "Cerrar sesión",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="inline-block h-9" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={
        className ||
        `inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold
         bg-amber-500 text-white hover:text-orange-700 hover:bg-orange-50
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500`
      }
    >
      {children}
    </button>
  );
}
