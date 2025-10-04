// Helper único para crear el cliente de Stripe sin fijar apiVersion.
// Si ya tienes este archivo, asegúrate de exportar solo la función.
import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}
