import Link from "next/link";
import SigninForm from "./signinForm";

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
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

      {/* Formulario separado en Client Component */}
      <SigninForm callbackUrl={callbackUrl} />

      <p className="text-sm opacity-80">
        ¿No tienes cuenta?{" "}
        <Link className="underline" href="/">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
