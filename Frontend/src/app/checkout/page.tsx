"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Lock, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCart } from "@/hooks/use-cart";
import { useCartStore } from "@/store/cart";
import { useAppliedCoupon } from "@/hooks/use-applied-coupon";
import { getAddresses } from "@/lib/api/addresses";
import { getStoreSettingsClient } from "@/lib/api/settings";
import { checkout, getPaymentStatus } from "@/lib/api/orders";
import type { CheckoutResponse } from "@/lib/api/orders";
import { formatPrice } from "@/lib/format";
import { AddressSection } from "@/components/checkout/address-section";
import { ContactSection } from "@/components/checkout/contact-section";
import { GuestDeliverySection } from "@/components/checkout/guest-delivery-section";
import { EMPTY_ADDRESS_FORM, type AddressFormValues } from "@/components/checkout/address-form-fields";
import { OrderSummary } from "@/components/checkout/order-summary";
import { CouponField } from "@/components/checkout/coupon-field";
import { PaymentSection, type PaymentMethodType } from "@/components/checkout/payment-section";
import { CartChangedBanner } from "@/components/products/cart-changed-banner";
import { requireShop } from "@/lib/features";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api-error";

export default function CheckoutPage() {
  requireShop();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { cart, isLoading: cartLoading } = useCart();
  const clearLocalCart = useCartStore((s) => s.clear);
  const { coupon, setCoupon } = useAppliedCoupon();

  // null means "no explicit choice yet" — see effectiveAddressId below, which
  // is what every reader of this actually uses.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  // Guest-only state. Kept here rather than in the child sections so the
  // place-order mutation can read it directly at submit time.
  const [guestEmail, setGuestEmail] = useState("");
  const [guestAddress, setGuestAddress] = useState<AddressFormValues>(EMPTY_ADDRESS_FORM);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("card");
  const [session, setSession] = useState<CheckoutResponse["payment"] & { orderNumber: string } | null>(null);
  // Set the moment an order is successfully placed, so the "cart is empty ->
  // go back to /cart" guard below can't hijack the navigation to the
  // confirmation page (placing an order clears the cart).
  const [orderPlaced, setOrderPlaced] = useState(false);

  // One key per visit, reused across retries so a network blip after clicking
  // pay can't produce a second order.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  // Guests have no address book — the query would 401 — so it only runs once
  // we know there's a session behind it.
  const addressesQuery = useQuery({ queryKey: ["addresses"], queryFn: getAddresses, enabled: !!user });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getStoreSettingsClient });

  // Falls back to the default (or first) saved address until the customer
  // makes an explicit choice — derived rather than synced into state via an
  // effect, since selectedAddressId already holds a real choice the moment
  // there is one and this is purely a fallback for before that.
  const defaultAddress =
    addressesQuery.data?.find(a => a.isDefault) ?? addressesQuery.data?.[0] ?? null;
  const effectiveAddressId = selectedAddressId ?? defaultAddress?._id ?? null;

  useEffect(() => {
    // Waits for auth to resolve because until it does we don't yet know which
    // cart source is authoritative, and an empty placeholder is
    // indistinguishable from a genuinely empty basket.
    // Also skipped once a payment session exists: the cart legitimately still
    // has items while the customer is mid-payment.
    if (!orderPlaced && !session && !userLoading && !cartLoading && cart.items.length === 0) {
      router.replace("/cart");
    }
  }, [orderPlaced, session, userLoading, cartLoading, cart.items.length, router]);

  const shippingCost = useMemo(() => {
    if (!settingsQuery.data) return null;
    if (coupon?.freeShipping) return 0;
    return cart.subtotal >= settingsQuery.data.freeShippingThresholdMinorUnits
      ? 0
      : settingsQuery.data.flatShippingRateMinorUnits;
  }, [settingsQuery.data, cart.subtotal, coupon?.freeShipping]);

  const discountAmount = coupon?.discountAmount ?? 0;
  const total = shippingCost === null ? null : cart.subtotal + shippingCost - discountAmount;
  const cartIsClean = !cart.hasChanges && cart.items.every((i) => i.available);

  // While the payment frame is open, poll our own backend rather than trusting
  // the provider's browser redirect — that redirect is lost if the customer
  // closes the tab or a 3-D Secure step misbehaves, and the webhook is the
  // real source of truth anyway.
  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const status = await getPaymentStatus(session.orderNumber);
        if (cancelled) return;

        if (status.paymentStatus === "paid") {
          clearInterval(interval);
          setOrderPlaced(true);
          // The webhook cleared the member's server cart, but it has no way
          // to reach a guest's browser-local one — so that happens here.
          if (!user) {
            clearLocalCart();
          }
          queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          router.push(`/order-confirmation/${session.orderNumber}`);
        } else if (status.paymentStatus === "failed") {
          clearInterval(interval);
          setSession(null);
          idempotencyKey.current = crypto.randomUUID();
          queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
          toast.error("That payment didn't go through. Your bag is unchanged — please try again.");
        }
      } catch {
        // Transient network error: keep polling rather than tearing down a
        // payment the customer may be halfway through.
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, queryClient, router, user, clearLocalCart]);

  const handleSessionExpired = useCallback(() => {
    setSession(null);
    idempotencyKey.current = crypto.randomUUID();
    queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
    toast.error("The payment window expired and your items were released. Please try again.");
  }, [queryClient]);

  const placeOrderMutation = useMutation({
    mutationFn: () =>
      checkout({
        idempotencyKey: idempotencyKey.current,
        paymentMethod,
        couponCode: coupon?.code ?? null,
        ...(user
          ? { addressId: effectiveAddressId }
          : {
              email: guestEmail.trim(),
              shippingAddress: {
                ...guestAddress,
                postalCode: guestAddress.postalCode || null,
              },
              // The guest's basket lives only in this browser, so it travels
              // with the request. The server re-prices every line before
              // charging anything.
              items: cart.items.map((i) => ({
                productId: i.productId,
                size: i.size,
                quantity: i.quantity,
              })),
            }),
      }),
    onSuccess: (result) => {
      // Consumed by the order that was just placed (or is now mid-payment) —
      // re-applying it to a future order would fail server-side anyway since
      // each coupon is redeemable once per person.
      setCoupon(null);
      if (result.payment) {
        setSession({ ...result.payment, orderNumber: result.order.orderNumber });
        return;
      }
      setOrderPlaced(true);
      // A member's cart was emptied server-side; a guest's lives here, so it
      // has to be cleared locally or the items would still be in the bag on
      // the confirmation page.
      if (!user) {
        clearLocalCart();
      }
      queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/order-confirmation/${result.order.orderNumber}`);
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Could not place your order — please try again"));
      if (apiErrorStatus(err) === 409) {
        queryClient.invalidateQueries({ queryKey: ["cart", "server"] });
      }
    },
  });

  // Switching method mid-flow abandons the in-progress payment session; the
  // backend sweeper releases its reservation.
  function handleSelectMethod(method: PaymentMethodType) {
    if (method === paymentMethod) return;
    if (session) {
      setSession(null);
      idempotencyKey.current = crypto.randomUUID();
    }
    setPaymentMethod(method);
  }

  // Only waits for auth to resolve — not for a session to exist. Rendering
  // before it settles would flash the guest form at a signed-in customer.
  if (userLoading) {
    return null;
  }

  // A member needs a saved address selected; a guest needs the fields they
  // typed to be complete. Both are re-validated server-side — this only
  // decides whether the button is worth enabling.
  const guestDetailsComplete =
    guestEmail.trim().length > 3 &&
    guestAddress.firstName.trim() !== "" &&
    guestAddress.lastName.trim() !== "" &&
    guestAddress.phone.trim() !== "" &&
    guestAddress.addressLine.trim() !== "" &&
    guestAddress.city.trim() !== "";

  const deliveryReady = user ? !!effectiveAddressId : guestDetailsComplete;

  const canPlaceOrder =
    deliveryReady && cartIsClean && total !== null && !placeOrderMutation.isPending && !session;

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
        Checkout
      </h1>

      {/* Mobile: collapsible summary, mirroring the sticky desktop sidebar */}
      <div className="mb-8 border border-border md:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((v) => !v)}
          aria-expanded={summaryOpen}
          className="flex w-full items-center justify-between px-4 py-4 text-[13px]"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            Order Summary
            <ChevronDown
              className={`size-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          </span>
          <span className="font-semibold text-foreground">{total === null ? "—" : formatPrice(total)}</span>
        </button>
        {summaryOpen && (
          <div className="space-y-4 border-t border-border p-4">
            <CouponField items={cart.items} isAuthenticated={!!user} guestEmail={user ? null : guestEmail.trim()} />
            <OrderSummary
              items={cart.items}
              subtotal={cart.subtotal}
              shippingCost={shippingCost}
              discountAmount={discountAmount}
              couponCode={coupon?.code ?? null}
              total={total}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <div className="space-y-10 md:col-span-2">
          <CartChangedBanner items={cart.items} />

          <ContactSection
            email={guestEmail}
            onEmailChange={setGuestEmail}
            signedInEmail={user?.email ?? null}
            disabled={placeOrderMutation.isPending || !!session}
          />

          {user ? (
            <AddressSection
              addresses={addressesQuery.data ?? []}
              selectedId={effectiveAddressId}
              onSelect={setSelectedAddressId}
            />
          ) : (
            <GuestDeliverySection
              value={guestAddress}
              onChange={setGuestAddress}
              disabled={placeOrderMutation.isPending || !!session}
            />
          )}

          <section aria-labelledby="shipping-heading">
            <h2 id="shipping-heading" className="mb-4 font-heading text-headline-sm font-bold text-foreground">
              Shipping Method
            </h2>
            <div className="flex items-center justify-between border border-foreground p-4 text-sm">
              <span className="flex items-center gap-3 text-foreground">
                <Truck className="size-4" strokeWidth={1.5} />
                Standard Shipping
              </span>
              <span className="font-medium text-foreground">
                {shippingCost === null ? "—" : shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
              </span>
            </div>
          </section>

          <PaymentSection
            selected={paymentMethod}
            onSelect={handleSelectMethod}
            iframeUrl={session?.iframeUrl ?? null}
            expiresAt={session?.expiresAt ?? null}
            onExpire={handleSessionExpired}
            disabled={placeOrderMutation.isPending}
          />

          {session ? (
            <div className="border border-border bg-muted px-5 py-4 text-[13px] text-muted-foreground">
              Complete your card details above to finish this order. We&apos;ll confirm automatically once
              your payment goes through.
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => placeOrderMutation.mutate()}
                disabled={!canPlaceOrder}
                className="w-full bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {placeOrderMutation.isPending
                  ? "Processing…"
                  : paymentMethod === "card"
                    ? `Pay ${total === null ? "" : formatPrice(total)}`
                    : "Place Order"}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
                <Lock className="size-3" strokeWidth={2} />
                Secure checkout — your payment details are never stored on our servers.
              </p>
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <div className="sticky top-24 space-y-6 bg-muted p-8">
            <OrderSummary
              items={cart.items}
              subtotal={cart.subtotal}
              shippingCost={shippingCost}
              discountAmount={discountAmount}
              couponCode={coupon?.code ?? null}
              total={total}
            />
            <CouponField items={cart.items} isAuthenticated={!!user} guestEmail={user ? null : guestEmail.trim()} />
          </div>
        </div>
      </div>
    </div>
  );
}
