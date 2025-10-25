import Link from "next/link";

type StyleButtonProps = {
  href: string;
  label?: string;
  text: string; 
  method?: "get" | "post";      
  size?: "sm" | "md";          
  className?: string;          
};

export default function StyleButton({
  href,
  label,
  text,
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

  return (
    <Link href={href} aria-label={label} className={base}>
      {text}
    </Link>
  );
}
