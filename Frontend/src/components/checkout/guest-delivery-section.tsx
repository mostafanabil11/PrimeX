"use client";

import { AddressFormFields, type AddressFormValues } from "./address-form-fields";

// The guest delivery step. Deliberately not a <form> and with no save action:
// these values go straight into the order being placed, and nowhere else.
// Nothing is persisted, so there is no account to create and nothing to clean
// up if the customer abandons checkout.
export function GuestDeliverySection({
  value,
  onChange,
  disabled = false,
}: {
  value: AddressFormValues;
  onChange: (next: AddressFormValues) => void;
  disabled?: boolean;
}) {
  return (
    <section aria-labelledby="delivery-heading">
      <h2 id="delivery-heading" className="mb-6 font-heading text-headline-sm font-bold text-foreground">
        Delivery
      </h2>
      <div className="space-y-4">
        <AddressFormFields value={value} onChange={onChange} idPrefix="guest" disabled={disabled} />
      </div>
    </section>
  );
}
