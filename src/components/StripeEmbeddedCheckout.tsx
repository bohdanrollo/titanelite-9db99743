import { useCallback, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

interface Props {
  priceId: string;
  returnUrl?: string;
}

/** Turn raw Stripe/network failures into something a customer can act on. */
function friendlyMessage(raw: string): { title: string; detail: string } {
  const m = raw.toLowerCase();
  if (m.includes("not configured") || m.includes("go-live")) {
    return {
      title: "Checkout isn't available right now",
      detail: "Payments are being set up on our end. Please try again shortly or contact us and we'll get you sorted.",
    };
  }
  if (m.includes("price not found")) {
    return {
      title: "That plan is temporarily unavailable",
      detail: "The plan you selected couldn't be loaded. Go back and pick a plan again, or contact us if it keeps happening.",
    };
  }
  if (m.includes("unauthorized") || m.includes("401") || m.includes("session")) {
    return {
      title: "Your sign-in session expired",
      detail: "Sign in again, then reopen checkout. Your plan selection isn't lost.",
    };
  }
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) {
    return {
      title: "Connection problem",
      detail: "We couldn't reach the payment service. Check your internet connection and retry — nothing has been charged.",
    };
  }
  return {
    title: "We couldn't start checkout",
    detail: `${raw} — nothing has been charged. Retry below, and contact us if this keeps happening.`,
  };
}

export function StripeEmbeddedCheckoutForm({ priceId, returnUrl }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [runtimeError, setError] = useState<string | null>(null);
  const stripe = useMemo(() => {
    try {
      return { promise: getStripe(), err: null as string | null };
    } catch (e) {
      return {
        promise: null,
        err: e instanceof Error ? e.message : "Payments are not configured",
      };
    }
  }, []);
  const error = stripe.err ?? runtimeError;



  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const result = await createCheckoutSession({
        data: {
          priceId,
          returnUrl:
            returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
      setError(null);
      return result.clientSecret;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error starting checkout";
      setError(msg);
      throw e;
    }
  }, [priceId, returnUrl]);

  if (error) {
    const { title, detail } = friendlyMessage(error);
    return (
      <div className="p-6 sm:p-10 text-center">
        <AlertTriangle size={40} className="mx-auto text-blood" />
        <div className="text-eyebrow mt-5">Checkout error</div>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">{detail}</p>
        <div className="mt-7 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
            className="btn-blood hover:btn-blood-hover inline-flex items-center gap-2"
          >
            <RotateCw size={15} /> Try again
          </button>
          <Link to="/contact" className="btn-ghost inline-flex items-center">
            Contact support
          </Link>
        </div>
        {attempt >= 2 && (
          <p className="mt-5 text-xs text-muted-foreground">
            Still failing after {attempt + 1} attempts? Reach out with the message above and we'll activate your access manually.
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="checkout">
      {/* key remounts the provider so a retry creates a fresh session */}
      <EmbeddedCheckoutProvider key={attempt} stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
