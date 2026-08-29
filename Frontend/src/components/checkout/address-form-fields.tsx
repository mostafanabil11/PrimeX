"use client";

import { EGYPT_GOVERNORATES, type EgyptGovernorate } from "@/types/address";

export interface AddressFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  governorate: EgyptGovernorate;
  postalCode: string;
}

export const EMPTY_ADDRESS_FORM: AddressFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine: "",
  city: "",
  governorate: "Cairo",
  postalCode: "",
};

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground";
const labelClass = "mb-2 block font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase";

// The delivery fields themselves, with no opinion about what happens to them.
// Shared by the signed-in "add a new address" form (which POSTs them to the
// address book) and the guest checkout form (which just hands them to the
// order) — so the two can never drift into asking for different things.
//
// idPrefix keeps the label/input wiring unique when more than one instance is
// on the page.
export function AddressFormFields({
  value,
  onChange,
  idPrefix = "addr",
  disabled = false,
}: {
  value: AddressFormValues;
  onChange: (next: AddressFormValues) => void;
  idPrefix?: string;
  disabled?: boolean;
}) {
  function set<K extends keyof AddressFormValues>(key: K, v: AddressFormValues[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-firstName`}>
            First Name
          </label>
          <input
            id={`${idPrefix}-firstName`}
            required
            disabled={disabled}
            autoComplete="given-name"
            value={value.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-lastName`}>
            Last Name
          </label>
          <input
            id={`${idPrefix}-lastName`}
            required
            disabled={disabled}
            autoComplete="family-name"
            value={value.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-addressLine`}>
          Address
        </label>
        <input
          id={`${idPrefix}-addressLine`}
          required
          disabled={disabled}
          autoComplete="street-address"
          value={value.addressLine}
          onChange={(e) => set("addressLine", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-city`}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            required
            disabled={disabled}
            autoComplete="address-level2"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-governorate`}>
            Governorate
          </label>
          <select
            id={`${idPrefix}-governorate`}
            required
            disabled={disabled}
            autoComplete="address-level1"
            value={value.governorate}
            onChange={(e) => set("governorate", e.target.value as EgyptGovernorate)}
            className={inputClass}
          >
            {EGYPT_GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-postalCode`}>
            Postal Code (optional)
          </label>
          <input
            id={`${idPrefix}-postalCode`}
            disabled={disabled}
            autoComplete="postal-code"
            value={value.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-phone`}>
            Phone
          </label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            required
            disabled={disabled}
            autoComplete="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}
