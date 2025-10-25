import Link from "next/link";

type StyleButtonProps = {
  href: string;                 // ruta o action
  label?: string;               // aria-label
  text: string;                 // texto visible
  method?: "get" | "post";      // si se pasa => renderiza <form><button>
  size?: "sm" | "md";           // tamaño de texto
  className?: string;           // extra classes opcionales
};

export default function StyleButton({
  href,
  label,
  text,
  method,
  size = "md",
  className = "",
}: StyleButtonProps) {
  const sizeClass = size === "sm" ? "text-sm" : "text-base";
  const base =
    `block text-center rounded-full px-4 py-2 font-medium ${sizeClass} ` +
    `!bg-amber-500 !text-white no-underline ` +
    `hover:!text-orange-700 hover:!bg-orange-50 transition ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ` +
    className;

  if (method) {
    return (
      <form action={href} method={method}>
        <button type="submit" className={base}>
          {text}
        </button>
      </form>
    );
  }

  return (
    <Link href={href} aria-label={label} className={base}>
      {text}
    </Link>
  );
}
