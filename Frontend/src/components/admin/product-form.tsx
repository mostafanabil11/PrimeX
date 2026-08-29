"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createProduct, updateProduct, type ProductInput } from "@/lib/api/products";
import { getAdminCategoryTree } from "@/lib/api/categories";
import type { Product, ProductSize } from "@/types/product";
import type { Category } from "@/types/category";
import { apiErrorMessage } from "@/lib/api-error";

const ALL_SIZES: ProductSize[] = ["S", "M", "L", "XL", "2XL"];

// Product category must be a subcategory (e.g. "Men > Hoodies"), never a
// top-level category — enforced server-side too (ProductsService.create).
function flattenAssignableCategories(tree: Category[]): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const parent of tree) {
    for (const child of parent.children ?? []) {
      result.push({ id: child._id, label: `${parent.name} > ${child.name}` });
    }
  }
  return result;
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const categoriesQuery = useQuery({ queryKey: ["admin", "categories", "tree"], queryFn: getAdminCategoryTree });
  const assignableCategories = flattenAssignableCategories(categoriesQuery.data ?? []);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [styleGroup, setStyleGroup] = useState(product?.styleGroup ?? "");
  const [category, setCategory] = useState(
    typeof product?.category === "string" ? product.category : (product?.category?._id ?? ""),
  );
  const [priceMajor, setPriceMajor] = useState(product ? String(product.price / 100) : "");
  const [discountPriceMajor, setDiscountPriceMajor] = useState(
    product?.discountPrice ? String(product.discountPrice / 100) : "",
  );
  const [images, setImages] = useState<string[]>(product?.images ?? [""]);
  const [sizes, setSizes] = useState<Record<ProductSize, number>>(() => {
    const base: Record<ProductSize, number> = { S: 0, M: 0, L: 0, XL: 0, "2XL": 0 };
    product?.sizes.forEach((s) => {
      base[s.size] = s.stock;
    });
    return base;
  });
  const [isBestSeller, setIsBestSeller] = useState(product?.isBestSeller ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: ProductInput = {
        name,
        description: description.trim() || null,
        color,
        styleGroup: styleGroup.trim() || null,
        category,
        price: Math.round(parseFloat(priceMajor || "0") * 100),
        discountPrice: discountPriceMajor.trim() ? Math.round(parseFloat(discountPriceMajor) * 100) : null,
        images: images.map((i) => i.trim()).filter(Boolean),
        sizes: ALL_SIZES.map((size) => ({ size, stock: sizes[size] })),
        isBestSeller,
      };
      return isEdit ? updateProduct(product._id, { ...payload, isActive }) : createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(isEdit ? "Product updated" : "Product created");
      router.push("/admin/products");
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Could not save product"));
    },
  });

  const inputClass =
    "w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground";
  const labelClass = "mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="max-w-2xl space-y-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <input required value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="" disabled>
              Select a subcategory…
            </option>
            {assignableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Style Group (optional)</label>
          <input
            value={styleGroup ?? ""}
            onChange={(e) => setStyleGroup(e.target.value)}
            placeholder="e.g. knitted-polo-t-shirt"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Shared key linking colorways of the same style.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Price (EGP)</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={priceMajor}
            onChange={(e) => setPriceMajor(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Discount Price (EGP, optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountPriceMajor}
            onChange={(e) => setDiscountPriceMajor(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Images (URLs)</label>
        <div className="space-y-2">
          {images.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setImages((prev) => prev.map((u, idx) => (idx === i ? e.target.value : u)))}
                placeholder="https://…"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={images.length === 1}
                className="shrink-0 border border-border px-3 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30"
                aria-label="Remove image"
              >
                <Trash2 className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setImages((prev) => [...prev, ""])}
          className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground underline hover:text-foreground"
        >
          <Plus className="size-3.5" strokeWidth={2} />
          Add image URL
        </button>
      </div>

      <div>
        <label className={labelClass}>Stock by Size</label>
        <div className="grid grid-cols-5 gap-3">
          {ALL_SIZES.map((size) => (
            <div key={size}>
              <label className="mb-1 block text-center text-[11px] text-muted-foreground">{size}</label>
              <input
                type="number"
                min="0"
                value={sizes[size]}
                onChange={(e) =>
                  setSizes((prev) => ({ ...prev, [size]: Math.max(0, parseInt(e.target.value || "0", 10)) }))
                }
                className={`${inputClass} text-center`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
          Best seller
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in storefront)
          </label>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-primary px-8 py-3 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="border border-border px-8 py-3 text-button font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
