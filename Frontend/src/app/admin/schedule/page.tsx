"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { getRules, createRule, stopRule, getSchedule, type RecurrenceRule } from "@/lib/api/schedule";
import { getBranchesAdmin, getClassTypesAdmin, getTrainersAdmin } from "@/lib/api/gym";
import { apiErrorMessage } from "@/lib/api-error";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { formatTime, DAY_LABELS } from "@/lib/gym-format";
import { WEEKDAYS } from "@/types/gym";
import { sessionTime, todayLocalDate } from "@/types/schedule";

const inputBase =
  "w-full border border-border bg-surface-2 px-3 py-2 text-[13px] text-foreground focus:border-ring focus:outline-none";

export default function AdminSchedulePage() {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: branches } = useQuery({ queryKey: ["admin", "branches"], queryFn: getBranchesAdmin });
  const { data: classTypes } = useQuery({
    queryKey: ["admin", "class-types"],
    queryFn: getClassTypesAdmin,
  });
  const { data: trainers } = useQuery({ queryKey: ["admin", "trainers"], queryFn: getTrainersAdmin });

  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin", "rules", branchFilter],
    queryFn: () => getRules(branchFilter || undefined),
  });

  const today = todayLocalDate("Africa/Cairo");
  const { data: todayTimetable } = useQuery({
    queryKey: ["admin", "schedule", "today", branchFilter],
    queryFn: () => getSchedule({ from: today, to: today, branch: branchFilter || undefined }),
  });

  const stop = useMutation({
    mutationFn: (id: string) => stopRule(id),
    onSuccess: () => {
      toast.success("Slot stopped");
      queryClient.invalidateQueries({ queryKey: ["admin", "rules"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not stop that slot")),
  });

  // Group into a grid: one column per weekday, rows sorted by time within.
  const byDay = new Map<string, RecurrenceRule[]>();
  for (const day of WEEKDAYS) byDay.set(day, []);
  for (const rule of rules ?? []) {
    byDay.get(rule.weekday)?.push(rule);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <div>
      <AdminPageHeader title="Schedule" count={rules?.length} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          className={inputBase + " w-auto"}
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="">All branches</option>
          {branches?.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="ms-auto flex items-center gap-2 bg-primary px-5 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase"
        >
          <Plus className="size-4" strokeWidth={2} />
          New slot
        </button>
      </div>

      {showForm && branches && classTypes && trainers && (
        <NewSlotForm
          branches={branches}
          classTypes={classTypes}
          trainers={trainers}
          onDone={() => setShowForm(false)}
        />
      )}

      {todayTimetable && todayTimetable.sessions.length > 0 && (
        <div className="mb-8 border border-border bg-surface-1 p-5">
          <h2 className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Today&apos;s sessions — open one to take the roster or cancel it
          </h2>
          <div className="flex flex-wrap gap-2">
            {todayTimetable.sessions.map((s) => (
              <Link
                key={s._id}
                href={`/admin/schedule/sessions/${s._id}`}
                className="border border-border bg-background px-3 py-2 text-[12px] text-foreground hover:border-primary"
              >
                <span className="font-semibold tabular-nums">{sessionTime(s, "Africa/Cairo")}</span>{" "}
                {s.classType.name} · {s.branch.name} · {s.bookedCount}/{s.capacity}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mb-4 text-[12px] text-muted-foreground">
        The grid below is the recurring pattern. To manage a specific occurrence — cancel it, mark
        attendance, see who is booked — open it from today&apos;s sessions above, or from the{" "}
        <a href="/schedule" target="_blank" rel="noreferrer" className="text-primary underline">
          public timetable
        </a>
        .
      </p>

      {isLoading || !rules ? (
        <div className="h-96 animate-pulse bg-muted" />
      ) : rules.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No recurring slots yet. Add one to start filling the timetable.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[70rem] grid-cols-7 gap-px bg-border">
            {WEEKDAYS.map((day) => (
              <div key={day} className="bg-surface-1 p-3">
                <h3 className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  {DAY_LABELS[day]}
                </h3>
                <div className="flex flex-col gap-2">
                  {byDay.get(day)?.map((rule) => (
                    <div
                      key={rule._id}
                      className="group relative border border-border bg-background p-2.5 text-[11px]"
                    >
                      <p className="font-semibold text-foreground tabular-nums">
                        {formatTime(rule.startTime)}
                      </p>
                      <p className="mt-0.5 text-foreground">{rule.classType.name}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {rule.branch.name}
                        {rule.trainer && ` · ${rule.trainer.name}`}
                      </p>
                      <p className="text-muted-foreground">cap {rule.capacity}</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Stop this slot? Future sessions with nobody booked are removed; sessions with bookings are cancelled and members notified.`,
                            )
                          ) {
                            stop.mutate(rule._id);
                          }
                        }}
                        aria-label="Stop this slot"
                        className="absolute top-1.5 right-1.5 hidden p-1 text-muted-foreground hover:text-destructive group-hover:block"
                      >
                        <X className="size-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  {byDay.get(day)?.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewSlotForm({
  branches,
  classTypes,
  trainers,
  onDone,
}: {
  branches: Array<{ _id: string; name: string }>;
  classTypes: Array<{ _id: string; name: string; durationMinutes: number; defaultCapacity: number }>;
  trainers: Array<{ _id: string; name: string }>;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  const [classTypeId, setClassTypeId] = useState(classTypes[0]?._id ?? "");
  const [branchId, setBranchId] = useState(branches[0]?._id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [weekday, setWeekday] = useState<string>("monday");
  const [startTime, setStartTime] = useState("18:00");
  const [capacity, setCapacity] = useState<number | "">("");
  const [room, setRoom] = useState("");
  const [womenOnly, setWomenOnly] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  const create = useMutation({
    mutationFn: () =>
      createRule({
        classTypeId,
        branchId,
        trainerId: trainerId || null,
        weekday,
        startTime,
        capacity: capacity === "" ? undefined : capacity,
        room: room || null,
        womenOnly,
        effectiveFrom,
      }),
    onSuccess: () => {
      toast.success("Slot added to the timetable");
      queryClient.invalidateQueries({ queryKey: ["admin", "rules"] });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not create that slot")),
  });

  return (
    <form
      className="mb-8 grid gap-4 border border-border bg-surface-1 p-6 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <Field label="Class">
        <select className={inputBase} value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)} required>
          {classTypes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Branch">
        <select className={inputBase} value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Trainer">
        <select className={inputBase} value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
          <option value="">Unassigned</option>
          {trainers.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Weekday">
        <select className={inputBase} value={weekday} onChange={(e) => setWeekday(e.target.value)}>
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {DAY_LABELS[d]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Start time">
        <input
          type="time"
          className={inputBase}
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </Field>

      <Field label="Capacity" hint="Defaults to the class's own">
        <input
          type="number"
          min={1}
          className={inputBase}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </Field>

      <Field label="Room">
        <input className={inputBase} value={room} onChange={(e) => setRoom(e.target.value)} />
      </Field>

      <Field label="Starts from">
        <input
          type="date"
          className={inputBase}
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          required
        />
      </Field>

      <label className="flex items-center gap-2.5 self-end">
        <input
          type="checkbox"
          checked={womenOnly}
          onChange={(e) => setWomenOnly(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="text-[13px] text-foreground">Women only</span>
      </label>

      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-primary px-6 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase disabled:opacity-50"
        >
          {create.isPending ? "Adding…" : "Add slot"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
