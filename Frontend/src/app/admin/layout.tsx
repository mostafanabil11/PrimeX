"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminNav } from "@/components/admin/admin-nav";
import { Wordmark } from "@/components/layout/wordmark";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  // Front-desk staff belong here too: recording a membership and taking cash
  // are their job, and the backend already grants them those routes. This is
  // the coarse gate only — every admin-only screen is enforced server-side by
  // @Roles('admin'), and AdminNav hides what staff cannot use.
  const canSeeAdmin = user?.role === "admin" || user?.role === "staff";

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!canSeeAdmin) {
      router.replace("/");
    }
  }, [isLoading, user, router, canSeeAdmin]);

  if (isLoading || !user || !canSeeAdmin) {
    return null;
  }

  return (
    <div data-surface="app" className="mx-auto flex w-full max-w-(--spacing-container-max) gap-gutter px-margin-mobile pt-12 pb-stack-lg md:px-margin-desktop md:pt-16">
      {/* The sidebar is a panel, not a bare column: a surface step plus a
          border is what separates it from the content on a ground this dark,
          where a margin alone reads as an accident. */}
      <aside className="hidden w-60 shrink-0 border border-border bg-surface-1 py-6 md:block">
        <Link href="/" className="mb-6 block px-4">
          <Wordmark className="h-12 w-auto" />
        </Link>
        {/* Red chip rather than grey caps — this is the one label on the page
            that says which side of the site you are standing on. */}
        <p className="mb-5 ml-4 inline-block bg-primary px-2 py-1 text-[10px] font-bold tracking-[0.16em] text-primary-foreground uppercase">
          Admin
        </p>
        <AdminNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
