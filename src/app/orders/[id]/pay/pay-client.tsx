"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback, useMemo, useState } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PayClient({ clientSecret, orderId }: { clientSecret: string; orderId: string }) {
  // ⚠️ mueve appearance adentro del useMemo para que no sea dependencia cambiante
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: { theme: "stripe" as const },
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

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // redirige al confirmar (stripe puede necesitar redirección 3DS)
        return_url: `${window.location.origin}/orders/${orderId}/confirmation`,
      },
      redirect: "if_required",
    });

    setSubmitting(false);

    if (error) {
      // Mostrar mensaje claro en UI
      setMsg(error.message ?? "No se pudo procesar el pago.");
      return;
    }

    // Si no hubo redirect y no hay error, navegamos manualmente
    window.location.assign(`/orders/${orderId}/confirmation`);
  }, [stripe, elements, orderId]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {!!msg && <p className="text-sm text-red-500">{msg}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="rounded-lg border px-4 py-2 hover:bg-white/5 disabled:opacity-50"
      >
        {submitting ? "Procesando…" : "Pagar"}
      </button>
    </form>
  );
}
