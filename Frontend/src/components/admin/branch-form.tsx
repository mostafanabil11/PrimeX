"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TextInput,
  TextArea,
  NumberInput,
  Select,
  Toggle,
  StringList,
  FormSection,
  FormActions,
  apiErrorMessage,
} from "./form-fields";
import { createBranch, updateBranch, deactivateBranch } from "@/lib/api/gym";
import { EGYPT_GOVERNORATES } from "@/lib/egypt";
import { WEEKDAYS, type Branch, type OpeningHours, type WomenOnlyWindow } from "@/types/gym";

const DAY_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

// A row per weekday, always all seven, so a branch can never be saved with a
// day quietly missing — "we forgot to enter Friday" and "we are closed on
// Friday" look identical on the site otherwise.
function withEveryDay(hours: OpeningHours[]): OpeningHours[] {
  return WEEKDAYS.map(
    (day) =>
      hours.find((h) => h.day === day) ?? {
        day,
        isClosed: false,
        opensAt: "06:00",
        closesAt: "23:00",
      },
  );
}

export function BranchForm({ branch }: { branch?: Branch }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(branch);

  const [name, setName] = useState(branch?.name ?? "");
  const [description, setDescription] = useState(branch?.description ?? "");
  const [addressLine, setAddressLine] = useState(branch?.addressLine ?? "");
  const [city, setCity] = useState(branch?.city ?? "");
  const [governorate, setGovernorate] = useState(branch?.governorate ?? "Faiyum");
  const [latitude, setLatitude] = useState<number | null>(branch?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(branch?.longitude ?? null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(branch?.googleMapsUrl ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(branch?.whatsappNumber ?? "");
  const [email, setEmail] = useState(branch?.email ?? "");
  const [facilities, setFacilities] = useState<string[]>(branch?.facilities ?? []);
  const [images, setImages] = useState<string[]>(branch?.images ?? []);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>(
    withEveryDay(branch?.openingHours ?? []),
  );
  const [womenOnly, setWomenOnly] = useState<WomenOnlyWindow[]>(branch?.womenOnlyWindows ?? []);
  const [sortOrder, setSortOrder] = useState<number | null>(branch?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        addressLine,
        city,
        governorate,
        latitude,
        longitude,
        googleMapsUrl: googleMapsUrl || null,
        phone: phone || null,
        whatsappNumber: whatsappNumber || null,
        email: email || null,
        // Blank rows are an artefact of the "Add" button, not data.
        facilities: facilities.filter((f) => f.trim()),
        images: images.filter((i) => i.trim()),
        openingHours,
        womenOnlyWindows: womenOnly.filter((w) => w.startsAt && w.endsAt),
        sortOrder: sortOrder ?? 0,
        isActive,
      };

      return isEdit
        ? updateBranch(branch!._id, payload as Partial<Branch>)
        : createBranch(payload as Partial<Branch>);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Branch saved" : "Branch created");
      queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
      router.push("/admin/branches");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save the branch")),
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateBranch(branch!._id),
    onSuccess: () => {
      toast.success("Branch hidden from the site");
      queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
      router.push("/admin/branches");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not hide the branch")),
  });

  return (
    <form
      className="flex max-w-2xl flex-col gap-6 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <FormSection title="Identity">
        <TextInput label="Name" required value={name} onChange={setName} placeholder="Faiyum" />
        <TextArea
          label="Description"
          hint="One or two sentences, shown on the locations page."
          value={description}
          onChange={setDescription}
          maxLength={2000}
        />
      </FormSection>

      <FormSection title="Where it is">
        <TextInput
          label="Address"
          required
          value={addressLine}
          onChange={setAddressLine}
          placeholder="90th Street North, Fifth Settlement"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="City" required value={city} onChange={setCity} />
          <Select
            label="Governorate"
            required
            value={governorate}
            onChange={setGovernorate}
            options={EGYPT_GOVERNORATES.map((g) => ({ value: g, label: g }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Latitude"
            value={latitude}
            onChange={setLatitude}
            min={-90}
            max={90}
            step={0.0001}
          />
          <NumberInput
            label="Longitude"
            value={longitude}
            onChange={setLongitude}
            min={-180}
            max={180}
            step={0.0001}
          />
        </div>
        <TextInput
          label="Google Maps link"
          hint="Optional. Used for the Get directions button."
          value={googleMapsUrl}
          onChange={setGoogleMapsUrl}
        />
      </FormSection>

      <FormSection title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Phone" value={phone} onChange={setPhone} />
          <TextInput label="WhatsApp" value={whatsappNumber} onChange={setWhatsappNumber} />
        </div>
        <TextInput label="Email" type="email" value={email} onChange={setEmail} />
      </FormSection>

      <FormSection
        title="Opening hours"
        description="Local time, 24-hour. The gym is open 24/7 and the public site does not display this table — kept here for when per-branch hours matter again."
      >
        <div className="flex flex-col gap-2">
          {openingHours.map((h, i) => (
            <div key={h.day} className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <span className="text-[12px] font-medium text-foreground">{DAY_LABELS[h.day]}</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.isClosed}
                  aria-label={`${DAY_LABELS[h.day]} closed`}
                  className="size-4 shrink-0 accent-primary"
                  onChange={(e) => {
                    const next = [...openingHours];
                    next[i] = { ...h, isClosed: e.target.checked };
                    setOpeningHours(next);
                  }}
                />
                <span className="text-[12px] text-muted-foreground">Closed</span>
                {!h.isClosed && (
                  <>
                    <input
                      type="time"
                      value={h.opensAt}
                      aria-label={`${DAY_LABELS[h.day]} opens at`}
                      className="ml-2 border border-input bg-surface-2 px-2 py-1.5 text-base md:text-[12px] text-foreground"
                      onChange={(e) => {
                        const next = [...openingHours];
                        next[i] = { ...h, opensAt: e.target.value };
                        setOpeningHours(next);
                      }}
                    />
                    <span className="text-[12px] text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={h.closesAt}
                      aria-label={`${DAY_LABELS[h.day]} closes at`}
                      className="border border-input bg-surface-2 px-2 py-1.5 text-base md:text-[12px] text-foreground"
                      onChange={(e) => {
                        const next = [...openingHours];
                        next[i] = { ...h, closesAt: e.target.value };
                        setOpeningHours(next);
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Women-only hours"
        description="Recurring weekly windows. Members filter the timetable by these."
      >
        <div className="flex flex-col gap-2">
          {womenOnly.map((w, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                value={w.day}
                aria-label={`Women-only window ${i + 1} day`}
                className="border border-input bg-surface-2 px-2 py-1.5 text-base md:text-[12px] text-foreground"
                onChange={(e) => {
                  const next = [...womenOnly];
                  next[i] = { ...w, day: e.target.value as WomenOnlyWindow["day"] };
                  setWomenOnly(next);
                }}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={w.startsAt}
                aria-label={`Women-only window ${i + 1} starts at`}
                className="border border-input bg-surface-2 px-2 py-1.5 text-base md:text-[12px] text-foreground"
                onChange={(e) => {
                  const next = [...womenOnly];
                  next[i] = { ...w, startsAt: e.target.value };
                  setWomenOnly(next);
                }}
              />
              <span className="text-[12px] text-muted-foreground">to</span>
              <input
                type="time"
                value={w.endsAt}
                aria-label={`Women-only window ${i + 1} ends at`}
                className="border border-input bg-surface-2 px-2 py-1.5 text-base md:text-[12px] text-foreground"
                onChange={(e) => {
                  const next = [...womenOnly];
                  next[i] = { ...w, endsAt: e.target.value };
                  setWomenOnly(next);
                }}
              />
              <button
                type="button"
                className="ui-action ui-action--sm inline-flex text-[12px] text-destructive hover:underline"
                onClick={() => setWomenOnly(womenOnly.filter((_, index) => index !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="ui-action ui-action--ghost ui-action--sm inline-flex w-fit text-[12px] font-medium text-primary-soft hover:underline"
            onClick={() =>
              setWomenOnly([...womenOnly, { day: "sunday", startsAt: "10:00", endsAt: "13:00" }])
            }
          >
            + Add window
          </button>
        </div>
      </FormSection>

      <FormSection title="Facilities and photos">
        <StringList
          label="Facilities"
          hint="One per line. Shown as a list on the branch page."
          items={facilities}
          onChange={setFacilities}
          placeholder="Olympic lifting platforms"
        />
        <StringList
          label="Image URLs"
          items={images}
          onChange={setImages}
          placeholder="/images/branch-hero.jpg"
          maxItems={20}
        />
      </FormSection>

      <FormSection title="Listing">
        <NumberInput
          label="Sort order"
          hint="Lower numbers appear first."
          value={sortOrder}
          onChange={setSortOrder}
          min={0}
        />
        <Toggle
          label="Visible on the site"
          hint="Turn off to hide this branch without deleting it."
          checked={isActive}
          onChange={setIsActive}
        />
      </FormSection>

      <FormActions
        isSaving={save.isPending}
        saveLabel={isEdit ? "Save branch" : "Create branch"}
        onCancel={() => router.push("/admin/branches")}
        destructive={
          isEdit && branch!.isActive
            ? {
                label: "Hide from site",
                onClick: () => {
                  if (confirm(`Hide "${branch!.name}" from the website?`)) deactivate.mutate();
                },
              }
            : undefined
        }
      />
    </form>
  );
}
