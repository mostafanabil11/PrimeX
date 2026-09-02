"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, X } from "lucide-react";
import {
  getAdminCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type CategoryInput,
} from "@/lib/api/categories";
import type { Category } from "@/types/category";
import { requireShop } from "@/lib/features";
import { apiErrorMessage } from "@/lib/api-error";

const inputClass =
  "w-full border border-input bg-background px-3 py-2 text-base md:text-sm text-foreground outline-none focus:border-foreground";
const labelClass = "mb-1.5 block text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase";

function CategoryFormFields({
  value,
  onChange,
  parentOptions,
}: {
  value: CategoryInput;
  onChange: (v: CategoryInput) => void;
  parentOptions: Category[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>Name</label>
        <input required value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Parent</label>
        <select
          value={value.parent ?? ""}
          onChange={(e) => onChange({ ...value, parent: e.target.value || null })}
          className={inputClass}
        >
          <option value="">— Top level —</option>
          {parentOptions.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label className={labelClass}>Image URL</label>
        <input
          value={value.image ?? ""}
          onChange={(e) => onChange({ ...value, image: e.target.value || null })}
          className={inputClass}
        />
      </div>
      <div className="col-span-2">
        <label className={labelClass}>Description</label>
        <input
          value={value.description ?? ""}
          onChange={(e) => onChange({ ...value, description: e.target.value || null })}
          className={inputClass}
        />
      </div>
      <label className="col-span-2 flex items-center gap-2 text-[13px] text-foreground">
        <input
          type="checkbox"
          checked={value.isFeaturedOnHome ?? false}
          onChange={(e) => onChange({ ...value, isFeaturedOnHome: e.target.checked })}
        />
        Featured on homepage
      </label>
    </div>
  );
}

function emptyInput(): CategoryInput {
  return { name: "", parent: null, image: null, description: null, isFeaturedOnHome: false };
}

export default function AdminCategoriesPage() {
  requireShop();

  const queryClient = useQueryClient();
  const { data: tree, isLoading } = useQuery({ queryKey: ["admin", "categories", "tree"], queryFn: getAdminCategoryTree });

  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState<CategoryInput>(emptyInput());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<CategoryInput>(emptyInput());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "categories", "tree"] });

  const createMutation = useMutation({
    mutationFn: () => createCategory(createValue),
    onSuccess: () => {
      toast.success("Category created");
      setCreating(false);
      setCreateValue(emptyInput());
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not create category")),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => updateCategory(id, editValue),
    onSuccess: () => {
      toast.success("Category updated");
      setEditingId(null);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update category")),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (cat: Category) => updateCategory(cat._id, { isActive: !cat.isActive }),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update category")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not delete category")),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) => reorderCategories(items),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, "Could not reorder")),
  });

  function move(siblings: Category[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderMutation.mutate(reordered.map((c, i) => ({ id: c._id, displayOrder: i })));
  }

  function startEdit(cat: Category) {
    setEditingId(cat._id);
    setEditValue({
      name: cat.name,
      parent: cat.parent,
      image: cat.image,
      description: cat.description,
      isFeaturedOnHome: cat.isFeaturedOnHome,
    });
  }

  const topLevel = tree ?? [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-headline-sm font-bold text-foreground">Categories</h1>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="ui-action ui-action--sm flex items-center gap-2 bg-primary px-5 py-2.5 text-[12px] font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
        >
          {creating ? <X className="size-4" strokeWidth={2} /> : <Plus className="size-4" strokeWidth={2} />}
          {creating ? "Cancel" : "New Category"}
        </button>
      </div>

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="mb-8 max-w-lg border border-border p-5"
        >
          <CategoryFormFields value={createValue} onChange={setCreateValue} parentOptions={topLevel} />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="ui-action ui-action--sm inline-flex mt-4 bg-primary px-6 py-2.5 text-[12px] font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : (
        <div className="space-y-8">
          {topLevel.map((parent, parentIndex) => (
            <div key={parent._id} className="border border-border">
              <div className={`flex items-center justify-between gap-3 bg-muted px-4 py-3 ${!parent.isActive ? "opacity-50" : ""}`}>
                <span className="text-[13px] font-semibold text-foreground">
                  {parent.name}
                  {!parent.isActive && " (inactive)"}
                  {parent.isFeaturedOnHome && " ★"}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(topLevel, parentIndex, -1)} className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-foreground" aria-label="Move up">
                    <ArrowUp className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => move(topLevel, parentIndex, 1)} className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-foreground" aria-label="Move down">
                    <ArrowDown className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => startEdit(parent)} className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-foreground" aria-label="Edit">
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActiveMutation.mutate(parent)}
                    className="ui-action ui-action--ghost ui-action--sm inline-flex px-2 py-1 text-[11px] text-muted-foreground underline hover:text-foreground"
                  >
                    {parent.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${parent.name}"? This only works if it has no subcategories or products.`)) {
                        deleteMutation.mutate(parent._id);
                      }
                    }}
                    className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {editingId === parent._id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate(parent._id);
                  }}
                  className="border-b border-border p-4"
                >
                  <CategoryFormFields value={editValue} onChange={setEditValue} parentOptions={topLevel.filter((c) => c._id !== parent._id)} />
                  <div className="mt-3 flex gap-2">
                    <button type="submit" className="ui-action ui-action--sm inline-flex bg-primary px-5 py-2 text-[12px] font-medium text-primary-foreground uppercase transition-colors hover:bg-primary-hover">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="ui-action ui-action--outline ui-action--sm inline-flex border border-border px-5 py-2 text-[12px] uppercase hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-border">
                {(parent.children ?? []).map((child, childIndex) => (
                  <div key={child._id}>
                    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 pl-8 ${!child.isActive ? "opacity-50" : ""}`}>
                      <span className="text-[13px] text-foreground">
                        {child.name}
                        {!child.isActive && " (inactive)"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(parent.children ?? [], childIndex, -1)}
                          className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="Move up"
                        >
                          <ArrowUp className="size-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(parent.children ?? [], childIndex, 1)}
                          className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="Move down"
                        >
                          <ArrowDown className="size-3.5" strokeWidth={1.75} />
                        </button>
                        <button type="button" onClick={() => startEdit(child)} className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-foreground" aria-label="Edit">
                          <Pencil className="size-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActiveMutation.mutate(child)}
                          className="ui-action ui-action--ghost ui-action--sm inline-flex px-2 py-1 text-[11px] text-muted-foreground underline hover:text-foreground"
                        >
                          {child.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${child.name}"?`)) {
                              deleteMutation.mutate(child._id);
                            }
                          }}
                          className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                    {editingId === child._id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          updateMutation.mutate(child._id);
                        }}
                        className="border-t border-border p-4 pl-8"
                      >
                        <CategoryFormFields value={editValue} onChange={setEditValue} parentOptions={topLevel} />
                        <div className="mt-3 flex gap-2">
                          <button type="submit" className="ui-action ui-action--sm inline-flex bg-primary px-5 py-2 text-[12px] font-medium text-primary-foreground uppercase transition-colors hover:bg-primary-hover">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="ui-action ui-action--outline ui-action--sm inline-flex border border-border px-5 py-2 text-[12px] uppercase hover:bg-muted">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
