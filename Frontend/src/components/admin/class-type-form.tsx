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
import { createClassType, updateClassType, deactivateClassType } from "@/lib/api/gym";
import type { ClassType } from "@/types/gym";

// Names, not hex values — restyling the palette then stays a CSS edit rather
// than a database migration. These map to the tokens in globals.css.
const COLOR_TOKENS = [
  { value: "primary", label: "Lime (default)" },
  { value: "chart-2", label: "Green" },
  { value: "chart-4", label: "Blue" },
  { value: "chart-5", label: "Pale blue" },
  { value: "destructive", label: "Red" },
] as const;

const INTENSITY_LABELS = ["", "Very easy", "Easy", "Moderate", "Hard", "Very hard"];

export function ClassTypeForm({ classType }: { classType?: ClassType }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(classType);

  const [name, setName] = useState(classType?.name ?? "");
  const [description, setDescription] = useState(classType?.description ?? "");
  const [image, setImage] = useState(classType?.image ?? "");
  const [intensity, setIntensity] = useState<number | null>(classType?.intensity ?? 3);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(
    classType?.durationMinutes ?? 45,
  );
  const [equipment, setEquipment] = useState<string[]>(classType?.equipment ?? []);
  const [defaultCapacity, setDefaultCapacity] = useState<number | null>(
    classType?.defaultCapacity ?? 20,
  );
  const [colorToken, setColorToken] = useState(classType?.colorToken ?? "primary");
  const [sortOrder, setSortOrder] = useState<number | null>(classType?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(classType?.isActive ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        image: image || null,
        intensity: intensity ?? 3,
        durationMinutes: durationMinutes ?? 45,
        equipment: equipment.filter((e) => e.trim()),
        defaultCapacity: defaultCapacity ?? 20,
        colorToken: colorToken || null,
        sortOrder: sortOrder ?? 0,
        isActive,
      };

      return isEdit
        ? updateClassType(classType!._id, payload as Partial<ClassType>)
        : createClassType(payload as Partial<ClassType>);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Class type saved" : "Class type created");
      queryClient.invalidateQueries({ queryKey: ["admin", "class-types"] });
      router.push("/admin/class-types");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save the class type")),
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateClassType(classType!._id),
    onSuccess: () => {
      toast.success("Class type retired");
      queryClient.invalidateQueries({ queryKey: ["admin", "class-types"] });
      router.push("/admin/class-types");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not retire the class type")),
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
        <TextInput
          label="Name"
          required
          value={name}
          onChange={setName}
          placeholder="Strength Foundations"
        />
        <TextArea
          label="Description"
          hint="What happens in the session, and who it suits."
          value={description}
          onChange={setDescription}
          maxLength={2000}
        />
        <TextInput
          label="Image URL"
          value={image}
          onChange={setImage}
          placeholder="/images/classes/strength.jpg"
        />
      </FormSection>

      <FormSection
        title="The session"
        description="Defaults a new scheduled session inherits. Individual sessions can override the capacity."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Duration (minutes)"
            required
            value={durationMinutes}
            onChange={setDurationMinutes}
            min={5}
            max={300}
            step={5}
          />
          <NumberInput
            label="Default capacity"
            value={defaultCapacity}
            onChange={setDefaultCapacity}
            min={1}
            max={500}
          />
        </div>
        <NumberInput
          label="Intensity (1–5)"
          hint={
            intensity ? `${intensity} — ${INTENSITY_LABELS[intensity]}` : "The main thing beginners filter on."
          }
          value={intensity}
          onChange={setIntensity}
          min={1}
          max={5}
        />
        <StringList
          label="Equipment"
          hint="What members need, or what the room provides."
          items={equipment}
          onChange={setEquipment}
          placeholder="Kettlebells"
          maxItems={30}
        />
      </FormSection>

      <FormSection title="Timetable appearance">
        <Select
          label="Colour"
          hint="How this class is coloured in the weekly schedule."
          value={colorToken}
          onChange={setColorToken}
          options={COLOR_TOKENS.map((c) => ({ value: c.value as string, label: c.label }))}
        />
        <NumberInput
          label="Sort order"
          hint="Lower numbers appear first."
          value={sortOrder}
          onChange={setSortOrder}
          min={0}
        />
        <Toggle
          label="Available to schedule"
          hint="Turn off to retire a class. Sessions members already attended are kept."
          checked={isActive}
          onChange={setIsActive}
        />
      </FormSection>

      <FormActions
        isSaving={save.isPending}
        saveLabel={isEdit ? "Save class type" : "Create class type"}
        onCancel={() => router.push("/admin/class-types")}
        destructive={
          isEdit && classType!.isActive
            ? {
                label: "Retire class",
                onClick: () => {
                  if (confirm(`Retire "${classType!.name}"? Past sessions are kept.`))
                    deactivate.mutate();
                },
              }
            : undefined
        }
      />
    </form>
  );
}
