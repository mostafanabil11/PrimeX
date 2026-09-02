"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  getContentAdmin,
  updateContent,
  resetContentBlock,
  type ContentBlockInput,
} from "@/lib/api/gym";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { StringList, apiErrorMessage } from "@/components/admin/form-fields";
import type { ContentField } from "@/types/gym";

const GROUP_LABELS: Record<ContentField["group"], string> = {
  site: "Site-wide",
  home: "Home page",
  about: "About page",
  contact: "Contact page",
};

const GROUP_ORDER: ContentField["group"][] = ["site", "home", "about", "contact"];

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const { data: fields, isLoading } = useQuery({
    queryKey: ["admin", "content"],
    queryFn: getContentAdmin,
  });

  // Only keys the admin has actually touched. The API treats an absent key as
  // "leave alone", so posting every field back would mark the whole site as
  // overridden and quietly freeze it against future default changes.
  const [edits, setEdits] = useState<Record<string, string | string[]>>({});
  const [editsAr, setEditsAr] = useState<Record<string, string | string[]>>({});

  const save = useMutation({
    mutationFn: async () => {
      const keys = new Set([...Object.keys(edits), ...Object.keys(editsAr)]);
      const blocks: ContentBlockInput[] = [...keys].map((key) => {
        const english = edits[key];
        const arabic = editsAr[key];
        return {
          key,
          ...(english !== undefined ? (Array.isArray(english) ? { values: english } : { value: english }) : {}),
          ...(arabic !== undefined ? (Array.isArray(arabic) ? { valuesAr: arabic } : { valueAr: arabic }) : {}),
        };
      });
      return updateContent(blocks);
    },
    onSuccess: () => {
      toast.success("Content saved");
      setEdits({});
      setEditsAr({});
      queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save the content")),
  });

  const reset = useMutation({
    mutationFn: (key: string) => resetContentBlock(key),
    onSuccess: (_, key) => {
      toast.success("Reset to the default wording");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditsAr((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not reset the field")),
  });

  if (isLoading || !fields) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  const dirtyCount = new Set([...Object.keys(edits), ...Object.keys(editsAr)]).size;

  function currentValue(field: ContentField): string | string[] {
    return edits[field.key] ?? field.current;
  }

  function currentArabicValue(field: ContentField): string | string[] {
    return editsAr[field.key] ?? field.currentAr ?? (field.type === "list" ? [] : "");
  }

  return (
    <div>
      <AdminPageHeader title="Website content" />

      <p className="mb-8 max-w-2xl text-[13px] text-muted-foreground">
        The wording on the public pages. Anything left untouched shows its standard text, so you
        only need to edit what you actually want to change. Reset puts a field back to that
        standard wording.
      </p>

      <form
        className="flex max-w-2xl flex-col gap-10 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {GROUP_ORDER.map((group) => {
          const groupFields = fields.filter((f) => f.group === group);
          if (groupFields.length === 0) return null;

          return (
            <section key={group} className="flex flex-col gap-5 border-t border-border pt-6">
              <h2 className="font-display text-lg tracking-[-0.02em] text-foreground uppercase">
                {GROUP_LABELS[group]}
              </h2>

              {groupFields.map((field) => {
                const value = currentValue(field);
                const valueAr = currentArabicValue(field);
                const isDirty = field.key in edits || field.key in editsAr;

                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={field.key}
                        className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
                      >
                        {field.label}
                        {isDirty && <span className="ml-2 text-primary">unsaved</span>}
                      </label>
                      {field.isOverridden && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Reset "${field.label}" to the standard wording?`))
                              reset.mutate(field.key);
                          }}
                          className="ui-action ui-action--ghost ui-action--sm flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="size-3" strokeWidth={1.5} />
                          Reset
                        </button>
                      )}
                    </div>

                    <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">English</p>
                    {field.type === "list" ? (
                      <StringList
                        label=""
                        hint={field.hint}
                        items={Array.isArray(value) ? value : []}
                        onChange={(items) => setEdits({ ...edits, [field.key]: items })}
                        maxItems={30}
                      />
                    ) : field.type === "longText" ? (
                      <>
                        <textarea
                          id={field.key}
                          rows={4}
                          maxLength={field.maxLength}
                          value={typeof value === "string" ? value : ""}
                          onChange={(e) => setEdits({ ...edits, [field.key]: e.target.value })}
                          className="w-full resize-y border border-input bg-surface-2 px-3 py-2 text-base md:text-[13px] leading-relaxed text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <p className="text-[12px] text-muted-foreground">
                          {field.hint ? `${field.hint} · ` : ""}
                          {(typeof value === "string" ? value.length : 0)}/{field.maxLength}
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          id={field.key}
                          type="text"
                          maxLength={field.maxLength}
                          value={typeof value === "string" ? value : ""}
                          onChange={(e) => setEdits({ ...edits, [field.key]: e.target.value })}
                          className="w-full border border-input bg-surface-2 px-3 py-2 text-base md:text-[13px] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {field.hint && (
                          <p className="text-[12px] text-muted-foreground">{field.hint}</p>
                        )}
                      </>
                    )}

                    <div className="mt-3 border-t border-border pt-4" dir="rtl">
                      <p className="mb-2 text-right font-mono text-[10px] font-semibold text-muted-foreground">العربية</p>
                      {field.type === "list" ? (
                        <StringList
                          label=""
                          hint="Arabic version; English is used if this is left empty."
                          items={Array.isArray(valueAr) ? valueAr : []}
                          onChange={(items) => setEditsAr({ ...editsAr, [field.key]: items })}
                          maxItems={30}
                        />
                      ) : field.type === "longText" ? (
                        <textarea
                          rows={4}
                          maxLength={field.maxLength}
                          value={typeof valueAr === "string" ? valueAr : ""}
                          onChange={(e) => setEditsAr({ ...editsAr, [field.key]: e.target.value })}
                          placeholder="اتركه فارغاً لاستخدام النص الإنجليزي"
                          className="w-full resize-y border border-input bg-surface-2 px-3 py-2 text-base leading-relaxed text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring md:text-[13px]"
                        />
                      ) : (
                        <input
                          type="text"
                          maxLength={field.maxLength}
                          value={typeof valueAr === "string" ? valueAr : ""}
                          onChange={(e) => setEditsAr({ ...editsAr, [field.key]: e.target.value })}
                          placeholder="اتركه فارغاً لاستخدام النص الإنجليزي"
                          className="w-full border border-input bg-surface-2 px-3 py-2 text-base text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring md:text-[13px]"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background py-4">
          <button
            type="submit"
            disabled={save.isPending || dirtyCount === 0}
            className="ui-action ui-action--sm inline-flex bg-primary px-6 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {save.isPending
              ? "Saving…"
              : dirtyCount === 0
                ? "No changes"
                : `Save ${dirtyCount} ${dirtyCount === 1 ? "change" : "changes"}`}
          </button>
          {dirtyCount > 0 && (
            <button
              type="button"
              onClick={() => { setEdits({}); setEditsAr({}); }}
              className="ui-action ui-action--ghost ui-action--sm inline-flex px-4 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
