"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PayClient({ clientSecret, orderId }: { clientSecret: string; orderId: string }) {
  const options = useMemo(
    () => ({
      clientSecret,
      // Apariencia alineada a la marca (no cambia la lógica)
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#f59e0b", // amber-500
          colorText: "#1f2937", // zinc-800 aprox
          colorDanger: "#dc2626",
          borderRadius: "14px",
          fontFamily:
            'var(--font-manrope), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        },
        rules: {
          ".Input": {
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.1)",
            padding: "10px 12px",
          },
          ".Label": {
            fontSize: "13px",
          },
        },
      },
    }),
    [clientSecret]
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm orderId={orderId} />
    </Elements>
  );
}

function CheckoutForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setSubmitting(true);
      setMsg(null);

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}/confirmation`,
        },
        redirect: "if_required",
      });

      setSubmitting(false);

      if (error) {
        setMsg(error.message ?? "No se pudo procesar el pago.");
        return;
      }

      window.location.assign(`/orders/${orderId}/confirmation`);
    },
    [stripe, elements, orderId]
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Encabezado del bloque de pago */}
      <div className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">
          Pago seguro
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Ingresa los datos de tu tarjeta para completar tu compra.
        </p>

        {/* Stripe PaymentElement (responsivo por defecto) */}
        <div className="mt-4">
          <PaymentElement id="payment-element" />
        </div>

        {/* Mensaje de error */}
        {!!msg && (
          <div
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100"
            role="alert"
            aria-live="polite"
          >
            {msg}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Botón primario acorde a la receta */}
          <button
            type="submit"
            disabled={!stripe || submitting}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold
                       bg-amber-500 text-white transition
                       hover:text-orange-700 hover:bg-orange-50
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                       disabled:opacity-60"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                  <path
                    d="M22 12a10 10 0 0 1-10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                </svg>
                Procesando…
              </span>
            ) : (
              "Pagar"
            )}
          </button>
        </div>

        {/* Nota informativa */}
        <p className="mt-3 text-xs text-zinc-500">
          Tus datos se procesan de forma cifrada a través de Stripe.
        </p>
      </div>
    </form>
  );
}
