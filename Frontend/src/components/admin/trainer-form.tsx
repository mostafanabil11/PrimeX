"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TextInput,
  TextArea,
  NumberInput,
  MoneyInput,
  Toggle,
  StringList,
  FormSection,
  FormActions,
  apiErrorMessage,
} from "./form-fields";
import {
  createTrainer,
  updateTrainer,
  deactivateTrainer,
  getBranchesAdmin,
} from "@/lib/api/gym";
import { WEEKDAYS, type Trainer, type AvailabilityWindow, type Weekday } from "@/types/gym";

const DAY_LABELS: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

// The API populates branches on public reads and returns bare ids on admin
// reads. The form edits ids either way, so normalise on the way in.
function toBranchIds(trainer?: Trainer): string[] {
  if (!trainer) return [];
  return trainer.branches.map((b) => (typeof b === "string" ? b : b._id));
}

export function TrainerForm({ trainer }: { trainer?: Trainer }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(trainer);

  const { data: branches } = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: getBranchesAdmin,
  });

  const [name, setName] = useState(trainer?.name ?? "");
  const [headline, setHeadline] = useState(trainer?.headline ?? "");
  const [bio, setBio] = useState(trainer?.bio ?? "");
  const [photo, setPhoto] = useState(trainer?.photo ?? "");
  const [specialties, setSpecialties] = useState<string[]>(trainer?.specialties ?? []);
  const [certifications, setCertifications] = useState<string[]>(trainer?.certifications ?? []);
  const [languages, setLanguages] = useState<string[]>(trainer?.languages ?? []);
  const [years, setYears] = useState<number | null>(trainer?.yearsOfExperience ?? 0);
  const [branchIds, setBranchIds] = useState<string[]>(toBranchIds(trainer));
  const [availability, setAvailability] = useState<AvailabilityWindow[]>(
    trainer?.availability ?? [],
  );
  const [hourlyRate, setHourlyRate] = useState<number | null>(
    trainer?.hourlyRateMinorUnits ?? null,
  );
  const [instagramUrl, setInstagramUrl] = useState(trainer?.instagramUrl ?? "");
  const [sortOrder, setSortOrder] = useState<number | null>(trainer?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(trainer?.isActive ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name,
        headline: headline || null,
        bio: bio || null,
        photo: photo || null,
        specialties: specialties.filter((s) => s.trim()),
        certifications: certifications.filter((c) => c.trim()),
        languages: languages.filter((l) => l.trim()),
        yearsOfExperience: years ?? 0,
        branches: branchIds,
        availability: availability.filter((a) => a.startsAt && a.endsAt),
        hourlyRateMinorUnits: hourlyRate,
        instagramUrl: instagramUrl || null,
        sortOrder: sortOrder ?? 0,
        isActive,
      };

      return isEdit ? updateTrainer(trainer!._id, payload) : createTrainer(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Trainer saved" : "Trainer created");
      queryClient.invalidateQueries({ queryKey: ["admin", "trainers"] });
      router.push("/admin/trainers");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save the trainer")),
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateTrainer(trainer!._id),
    onSuccess: () => {
      toast.success("Trainer hidden from the site");
      queryClient.invalidateQueries({ queryKey: ["admin", "trainers"] });
      router.push("/admin/trainers");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not hide the trainer")),
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
        <TextInput label="Name" required value={name} onChange={setName} placeholder="Marcus Vance" />
        <TextInput
          label="Headline"
          hint="Their role in a few words — shown under the name on the card."
          value={headline}
          onChange={setHeadline}
          placeholder="Head of Strength"
        />
        <TextArea
          label="Bio"
          hint="Written in the third person. Two or three sentences reads best."
          value={bio}
          onChange={setBio}
          rows={5}
          maxLength={4000}
        />
        <TextInput
          label="Photo URL"
          value={photo}
          onChange={setPhoto}
          placeholder="/images/trainers/marcus.jpg"
        />
        <TextInput label="Instagram" value={instagramUrl} onChange={setInstagramUrl} />
      </FormSection>

      <FormSection title="Credentials">
        <StringList
          label="Specialties"
          items={specialties}
          onChange={setSpecialties}
          placeholder="Powerlifting"
          maxItems={20}
        />
        <StringList
          label="Certifications"
          items={certifications}
          onChange={setCertifications}
          placeholder="NSCA CSCS"
          maxItems={20}
        />
        <StringList
          label="Languages"
          items={languages}
          onChange={setLanguages}
          placeholder="Arabic"
          maxItems={10}
        />
        <NumberInput
          label="Years of experience"
          value={years}
          onChange={setYears}
          min={0}
          max={70}
        />
      </FormSection>

      <FormSection
        title="Branches"
        description="Where this trainer works. They appear on each branch page they are assigned to."
      >
        <div className="flex flex-col gap-2">
          {(branches ?? []).map((b) => (
            <label key={b._id} className="flex items-center gap-3">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-primary"
                checked={branchIds.includes(b._id)}
                onChange={(e) =>
                  setBranchIds(
                    e.target.checked
                      ? [...branchIds, b._id]
                      : branchIds.filter((id) => id !== b._id),
                  )
                }
              />
              <span className="text-[13px] text-foreground">
                {b.name}
                {!b.isActive && (
                  <span className="ml-2 text-[11px] text-muted-foreground">hidden</span>
                )}
              </span>
            </label>
          ))}
          {branches?.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              No branches yet — add one first, then assign trainers to it.
            </p>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Personal training"
        description="Availability is when they could take a session. Actual free slots subtract their classes and existing bookings."
      >
        <MoneyInput
          label="Hourly rate"
          hint="Leave empty if this trainer does not take personal training."
          minorUnits={hourlyRate}
          onChange={setHourlyRate}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Availability
          </span>
          {availability.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                value={a.day}
                aria-label={`Availability ${i + 1} day`}
                className="border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground"
                onChange={(e) => {
                  const next = [...availability];
                  next[i] = { ...a, day: e.target.value as Weekday };
                  setAvailability(next);
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
                value={a.startsAt}
                aria-label={`Availability ${i + 1} starts at`}
                className="border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground"
                onChange={(e) => {
                  const next = [...availability];
                  next[i] = { ...a, startsAt: e.target.value };
                  setAvailability(next);
                }}
              />
              <span className="text-[12px] text-muted-foreground">to</span>
              <input
                type="time"
                value={a.endsAt}
                aria-label={`Availability ${i + 1} ends at`}
                className="border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground"
                onChange={(e) => {
                  const next = [...availability];
                  next[i] = { ...a, endsAt: e.target.value };
                  setAvailability(next);
                }}
              />
              <button
                type="button"
                className="text-[12px] text-destructive hover:underline"
                onClick={() => setAvailability(availability.filter((_, index) => index !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="w-fit text-[12px] font-medium text-primary-soft hover:underline"
            onClick={() =>
              setAvailability([
                ...availability,
                { day: "sunday", startsAt: "09:00", endsAt: "17:00" },
              ])
            }
          >
            + Add window
          </button>
        </div>
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
          checked={isActive}
          onChange={setIsActive}
          hint="Turn off when someone leaves. Their past sessions are kept."
        />
      </FormSection>

      <FormActions
        isSaving={save.isPending}
        saveLabel={isEdit ? "Save trainer" : "Create trainer"}
        onCancel={() => router.push("/admin/trainers")}
        destructive={
          isEdit && trainer!.isActive
            ? {
                label: "Hide from site",
                onClick: () => {
                  if (confirm(`Hide "${trainer!.name}" from the website?`)) deactivate.mutate();
                },
              }
            : undefined
        }
      />
    </form>
  );
}
