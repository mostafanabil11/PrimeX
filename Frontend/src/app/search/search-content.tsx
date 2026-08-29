"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductBrowser } from "@/components/products/product-browser";
import { getSuggestions } from "@/lib/api/products";
import { formatPrice } from "@/lib/format";

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [term, setTerm] = useState(initialQ);
  const [debouncedTerm, setDebouncedTerm] = useState(initialQ);
  const [suggestTerm, setSuggestTerm] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Two debounces off the same keystrokes: a short one drives the
  // suggestions dropdown (fast, cheap prefix query), a longer one commits to
  // the URL and the full result grid — typing "hood" shouldn't spam
  // pagination/sort state resets on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setSuggestTerm(term.trim()), 150);
    return () => clearTimeout(handle);
  }, [term]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = term.trim();
      setDebouncedTerm(trimmed);
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      router.replace(`/search${params.toString() ? `?${params}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(handle);
  }, [term, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: suggestions } = useQuery({
    queryKey: ["products", "suggest", suggestTerm],
    queryFn: () => getSuggestions(suggestTerm),
    enabled: suggestTerm.length > 0,
  });

  const showDropdown = suggestionsOpen && suggestTerm.length > 0 && (suggestions?.length ?? 0) > 0;

  return (
    <div>
      <section className="border-b border-border bg-background py-16 text-center md:py-20">
        <div ref={containerRef} className="relative mx-auto flex max-w-lg items-center gap-3 px-margin-mobile">
          <SearchIcon className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            placeholder="Search for t-shirts, pants, jackets…"
            aria-label="Search products"
            autoComplete="off"
            className="w-full border-b border-border bg-transparent pb-3 text-center font-heading text-headline-sm font-bold text-foreground outline-none placeholder:text-muted-foreground placeholder:font-normal focus:border-foreground"
          />

          {showDropdown && (
            <div className="absolute top-full left-1/2 z-20 mt-2 w-full max-w-sm -translate-x-1/2 border border-border bg-background text-left shadow-lg">
              {suggestions!.map((s) => (
                <Link
                  key={s._id}
                  href={`/products/${s.slug}`}
                  onClick={() => setSuggestionsOpen(false)}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-muted"
                >
                  <div className="relative aspect-3/4 w-10 shrink-0 bg-muted">
                    {s.images[0] && <Image src={s.images[0]} alt="" fill className="object-cover" sizes="40px" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">{s.name}</p>
                    <p className="text-[12px] text-muted-foreground">{formatPrice(s.discountPrice ?? s.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
        {debouncedTerm ? (
          <ProductBrowser q={debouncedTerm} />
        ) : (
          <p className="py-24 text-center text-body-lg text-muted-foreground">
            Start typing to search our collection.
          </p>
        )}
      </div>
    </div>
  );
}
