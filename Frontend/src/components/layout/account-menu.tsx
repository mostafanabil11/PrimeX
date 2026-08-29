"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { User, LayoutDashboard, Settings, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logoutUser } from "@/lib/api/auth";
import { MEMBER_ACCOUNTS_ENABLED } from "@/lib/features";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const { data: user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await logoutUser();
    } catch {
      // Even if the API call fails, clear local state so the UI doesn't
      // strand the user in a signed-in-looking state.
    }
    queryClient.setQueryData(["auth", "profile"], null);
    queryClient.removeQueries({ queryKey: ["cart", "server"] });
    toast.success("Signed out");
    router.push("/");
  }

  if (isLoading) {
    return <span className={className} aria-hidden />;
  }

  if (!user) {
    return (
      <Link href="/login" aria-label="Account" className={className}>
        {iconOnly ? <User className="size-5" strokeWidth={1.5} /> : "Account"}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" aria-label="Account menu" className={className} />}
      >
        {iconOnly ? <User className="size-5" strokeWidth={1.5} /> : `Hi, ${user.firstName}`}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12}>
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">{user.email}</div>
        <DropdownMenuSeparator />
        {/* Orders and Wishlist were the clothing-shop leftovers here — this
            dropdown was never updated when the account sidebar (which does
            gate them behind SHOP_ENABLED, see account/layout.tsx) got its gym
            nav. My Account replaces them as the one link into that sidebar;
            it isn't duplicated item-by-item here since the sidebar is one
            click away.

            Both are hidden while member accounts are switched off, because
            /account 404s in that mode — an offer to go somewhere broken is
            worse than no offer. */}
        {MEMBER_ACCOUNTS_ENABLED && (
          <>
            <DropdownMenuItem render={<Link href="/account" />}>
              <LayoutDashboard className="size-4" strokeWidth={1.5} />
              My Account
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/account/settings" />}>
              <Settings className="size-4" strokeWidth={1.5} />
              Account Settings
            </DropdownMenuItem>
          </>
        )}
        {/* Staff too, not just admin: the front desk works out of /admin all
            day, and without this the only way in was typing the URL. */}
        {(user.role === "admin" || user.role === "staff") && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <ShieldCheck className="size-4" strokeWidth={1.5} />
            Admin Panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="size-4" strokeWidth={1.5} />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
