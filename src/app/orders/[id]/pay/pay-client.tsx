// src/app/orders/[id]/pay/pay-client.tsx
"use client";
import { loadStripe, type StripeElementsOptions, type Appearance } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useMemo, useState } from "react";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PayClient({ clientSecret, orderId }: { clientSecret: string; orderId: string }) {
  const appearance: Appearance = { theme: "stripe" };
  const options: StripeElementsOptions = useMemo(
    () => ({ clientSecret, appearance }),
    [clientSecret, appearance] // 👈 dependencia añadida
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
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}/confirmation`,
      },
      redirect: "if_required",
    });

    if (error) setMsg(error.message ?? "Pago no completado");
    else setMsg("Pago en proceso…");

    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={loading || !stripe || !elements}
        className="rounded-lg border px-4 py-2 hover:bg-white/5 disabled:opacity-50"
      >
        {loading ? "Procesando…" : "Pagar"}
      </button>

      {msg && <div className="text-sm opacity-80">{msg}</div>}
      <div className="text-sm">
        <Link href={`/orders/${orderId}/confirmation`} className="underline">
          Ver confirmación
        </Link>
      </div>
    </form>
  );
}
