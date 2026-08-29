"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TextInput,
  TextArea,
  NumberInput,
  MoneyInput,
  Select,
  Toggle,
  StringList,
  PerkList,
  FormSection,
  FormActions,
  apiErrorMessage,
} from "./form-fields";
import { createPlan, updatePlan, deactivatePlan } from "@/lib/api/gym";
import type {
  Plan,
  PlanPerk,
  DurationUnit,
  ClassAccessMode,
  BranchAccessMode,
  AccessScope,
} from "@/types/gym";

const DURATION_UNITS: ReadonlyArray<{ value: DurationUnit; label: string }> = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
  { value: "year", label: "Years" },
];

const CLASS_ACCESS: ReadonlyArray<{ value: ClassAccessMode; label: string }> = [
  { value: "none", label: "No classes — gym floor only" },
  { value: "credits", label: "A set number of classes per cycle" },
  { value: "unlimited", label: "Unlimited classes" },
];

const BRANCH_ACCESS: ReadonlyArray<{ value: BranchAccessMode; label: string }> = [
  { value: "single", label: "Home branch only" },
  { value: "all", label: "Every branch" },
];

const ACCESS_SCOPES: ReadonlyArray<{ value: AccessScope; label: string }> = [
  { value: "gym_or_fitness", label: "Gym or Fitness — member picks one" },
  { value: "gym_plus_fitness", label: "Gym + Fitness — both included" },
];

export function PlanForm({ plan }: { plan?: Plan }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(plan);

  const [name, setName] = useState(plan?.name ?? "");
  const [tier, setTier] = useState(plan?.tier ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [durationValue, setDurationValue] = useState<number | null>(plan?.durationValue ?? 1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(plan?.durationUnit ?? "month");
  const [price, setPrice] = useState<number | null>(plan?.priceMinorUnits ?? null);
  const [discount, setDiscount] = useState<number | null>(plan?.discountPriceMinorUnits ?? null);
  const [joiningFee, setJoiningFee] = useState<number | null>(plan?.joiningFeeMinorUnits ?? null);
  const [classMode, setClassMode] = useState<ClassAccessMode>(plan?.classAccess.mode ?? "none");
  const [credits, setCredits] = useState<number | null>(plan?.classAccess.creditsPerCycle ?? 0);
  const [branchAccess, setBranchAccess] = useState<BranchAccessMode>(
    plan?.branchAccess ?? "single",
  );
  const [accessScope, setAccessScope] = useState<AccessScope>(
    plan?.accessScope ?? "gym_or_fitness",
  );
  // Null means unlimited on both of these, which is why they start empty
  // rather than at zero — zero sessions a week is a plan nobody can use.
  const [sessionsIncluded, setSessionsIncluded] = useState<number | null>(
    plan?.sessionsIncluded ?? null,
  );
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(plan?.daysPerWeek ?? null);
  const [perks, setPerks] = useState<PlanPerk[]>(plan?.perks ?? []);
  const [freezeDays, setFreezeDays] = useState<number | null>(plan?.freezeDaysAllowed ?? 0);
  const [guestPasses, setGuestPasses] = useState<number | null>(plan?.guestPasses ?? 0);
  const [sortOrder, setSortOrder] = useState<number | null>(plan?.sortOrder ?? 0);
  const [isFeatured, setIsFeatured] = useState(plan?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        tier: tier || null,
        description: description || null,
        benefits: benefits.filter((b) => b.trim()),
        durationValue: durationValue ?? 1,
        durationUnit,
        priceMinorUnits: price ?? 0,
        discountPriceMinorUnits: discount,
        joiningFeeMinorUnits: joiningFee,
        classAccess: {
          mode: classMode,
          // Only meaningful for credits, but sent regardless so switching a
          // plan to credits and back does not lose the number.
          creditsPerCycle: credits ?? 0,
        },
        branchAccess,
        accessScope,
        sessionsIncluded,
        daysPerWeek,
        // Blank rows are dropped rather than saved as an unnamed perk.
        perks: perks.filter(p => p.label.trim().length > 0),
        freezeDaysAllowed: freezeDays ?? 0,
        guestPasses: guestPasses ?? 0,
        sortOrder: sortOrder ?? 0,
        isFeatured,
        isActive,
      };

      return isEdit
        ? updatePlan(plan!._id, payload as unknown as Partial<Plan>)
        : createPlan(payload as unknown as Partial<Plan>);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Plan saved" : "Plan created");
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      router.push("/admin/plans");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save the plan")),
  });

  const deactivate = useMutation({
    mutationFn: () => deactivatePlan(plan!._id),
    onSuccess: () => {
      toast.success("Plan hidden from the site");
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      router.push("/admin/plans");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not hide the plan")),
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
        <TextInput label="Name" required value={name} onChange={setName} placeholder="Six Months" />
        <TextInput
          label="Tier"
          hint="Groups plans on the pricing page — Essential, Performance, Student."
          value={tier}
          onChange={setTier}
        />
        <TextArea
          label="Description"
          value={description}
          onChange={setDescription}
          maxLength={2000}
        />
        <StringList
          label="Benefits"
          hint="The bullet list on the pricing card, in the order it should read."
          items={benefits}
          onChange={setBenefits}
          placeholder="Unlimited classes"
          maxItems={30}
        />
      </FormSection>

      <FormSection title="Term">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Length"
            required
            value={durationValue}
            onChange={setDurationValue}
            min={1}
            max={120}
          />
          <Select
            label="Unit"
            required
            value={durationUnit}
            onChange={setDurationUnit}
            options={DURATION_UNITS}
          />
        </div>
      </FormSection>

      <FormSection title="Price">
        <MoneyInput label="Price" required minorUnits={price} onChange={setPrice} />
        <MoneyInput
          label="Discounted price"
          hint="Leave empty for no discount. Must be lower than the price."
          minorUnits={discount}
          onChange={setDiscount}
        />
        <MoneyInput
          label="Joining fee override"
          hint="Leave empty to use the gym-wide fee from settings. Enter 0 to waive it for this plan."
          minorUnits={joiningFee}
          onChange={setJoiningFee}
        />
      </FormSection>

      <FormSection title="What it grants">
        <Select
          label="Class access"
          required
          value={classMode}
          onChange={setClassMode}
          options={CLASS_ACCESS}
        />
        {classMode === "credits" && (
          <NumberInput
            label="Credits per cycle"
            hint="Resets monthly. A credits plan needs at least one."
            required
            value={credits}
            onChange={setCredits}
            min={1}
            max={500}
          />
        )}
        <Select
          label="Branch access"
          required
          value={branchAccess}
          onChange={setBranchAccess}
          options={BRANCH_ACCESS}
        />
        <Select
          label="What they can train in"
          required
          value={accessScope}
          onChange={setAccessScope}
          options={ACCESS_SCOPES}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Sessions included"
            hint="Total visits over the whole term. Leave blank for unlimited."
            value={sessionsIncluded}
            onChange={setSessionsIncluded}
            min={0}
            max={2000}
          />
          <NumberInput
            label="Days a week"
            hint="Leave blank if they can train every day."
            value={daysPerWeek}
            onChange={setDaysPerWeek}
            min={1}
            max={7}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Freeze days allowed"
            hint="Capped by the gym-wide maximum in settings."
            value={freezeDays}
            onChange={setFreezeDays}
            min={0}
            max={365}
          />
          <NumberInput
            label="Guest passes"
            value={guestPasses}
            onChange={setGuestPasses}
            min={0}
            max={100}
          />
        </div>
        <PerkList
          label="Extras"
          hint="Countable benefits shown on the pricing card, like 10 Jacuzzi or 3 InBody."
          items={perks}
          onChange={setPerks}
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
          label="Highlight on the pricing page"
          hint="The emphasised column. More than one is allowed, but rarely a good idea."
          checked={isFeatured}
          onChange={setIsFeatured}
        />
        <Toggle
          label="Available to buy"
          hint="Turn off to stop new sign-ups. Existing memberships are unaffected."
          checked={isActive}
          onChange={setIsActive}
        />
      </FormSection>

      <FormActions
        isSaving={save.isPending}
        saveLabel={isEdit ? "Save plan" : "Create plan"}
        onCancel={() => router.push("/admin/plans")}
        destructive={
          isEdit && plan!.isActive
            ? {
                label: "Stop selling",
                onClick: () => {
                  if (confirm(`Stop selling "${plan!.name}"? Existing members keep their plan.`))
                    deactivate.mutate();
                },
              }
            : undefined
        }
      />
    </form>
  );
}
