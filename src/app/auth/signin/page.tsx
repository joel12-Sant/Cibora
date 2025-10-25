import Link from "next/link";
import SigninForm from "./SigninForm";

// Next 15: searchParams es Promise
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = "/", error } = await searchParams;

  const errorMsg =
    error === "CredentialsSignin"
      ? "Credenciales inválidas."
      : error
      ? "No se pudo iniciar sesión."
      : null;

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <header className="mb-4">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Accede para continuar tu pedido.
            </p>
          </header>

          {errorMsg && (
            <div
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100"
              role="alert"
              aria-live="polite"
            >
              {errorMsg}
            </div>
          )}

          {/* Formulario (Client Component) */}
          <SigninForm callbackUrl={callbackUrl} />

          {/* Enlaces de ayuda */}
          <div className="mt-5 grid gap-2 text-sm">
            <p className="text-zinc-700">
              ¿No tienes cuenta?{" "}
              <Link
                className="font-semibold text-orange-700 underline underline-offset-2 hover:opacity-90"
                href="/auth/signup"
                prefetch={false}
              >
                Crear cuenta
              </Link>
            </p>
            <p>
              <Link
                className="text-zinc-700 underline underline-offset-2 hover:text-orange-700"
                href="/"
              >
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
