"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAddress } from "@/lib/api/addresses";
import type { Address } from "@/types/address";
import { AddressFormFields, EMPTY_ADDRESS_FORM, type AddressFormValues } from "./address-form-fields";
import { apiErrorMessage } from "@/lib/api-error";

// The signed-in delivery step: pick from the address book, or add one to it.
// Guests get GuestDeliverySection instead — same fields, but nowhere to save
// them to.
export function AddressSection({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [form, setForm] = useState<AddressFormValues>(EMPTY_ADDRESS_FORM);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: (address) => {
      queryClient.setQueryData<Address[]>(["addresses"], (prev) => [...(prev ?? []), address]);
      onSelect(address._id);
      setShowForm(false);
      setForm(EMPTY_ADDRESS_FORM);
      toast.success("Address added");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save address")),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      addressLine: form.addressLine,
      city: form.city,
      governorate: form.governorate,
      postalCode: form.postalCode || null,
      isDefault: addresses.length === 0,
    });
  }

  return (
    <section>
      <h2 className="mb-6 font-heading text-headline-sm font-bold text-foreground">Delivery</h2>

      {addresses.length > 0 && (
        <div role="radiogroup" aria-label="Saved addresses" className="mb-6 space-y-3">
          {addresses.map((address) => (
            <button
              key={address._id}
              type="button"
              role="radio"
              aria-checked={selectedId === address._id}
              onClick={() => onSelect(address._id)}
              className={`block w-full border p-4 text-left text-sm transition-colors ${
                selectedId === address._id ? "border-foreground" : "border-border hover:border-foreground/50"
              }`}
            >
              <p className="font-medium text-foreground">
                {address.firstName} {address.lastName}
                {address.isDefault && (
                  <span className="ml-2 font-mono text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                    Default
                  </span>
                )}
              </p>
              <p className="mt-1 text-muted-foreground">
                {address.addressLine}, {address.city}, {address.governorate}
              </p>
              <p className="text-muted-foreground">{address.phone}</p>
            </button>
          ))}

          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-[13px] font-semibold text-foreground underline"
            >
              + Use a different address
            </button>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-6">
          <AddressFormFields
            value={form}
            onChange={setForm}
            idPrefix="saved"
            disabled={createMutation.isPending}
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary px-6 py-3 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Saving…" : "Save Address"}
            </button>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 text-button font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:opacity-70"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
