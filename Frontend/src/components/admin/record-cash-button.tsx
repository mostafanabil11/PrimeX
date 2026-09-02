"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { recordCashPayment } from "@/lib/api/membership";
import { apiErrorMessage } from "@/lib/api-error";
import type { PaymentMethod } from "@/types/membership";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Settles an invoice the gym collected off-system — cash at the desk, or an
// InstaPay transfer whose receipt staff have checked.
//
// Taking money is not undoable from here, so it confirms with the amount and
// the reference in the prompt — the two things a staff member can check
// against what is actually in their hand.
export function RecordCashButton({
  invoiceId,
  invoiceNumber,
  amount,
  method,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: string;
  method: PaymentMethod;
}) {
  const queryClient = useQueryClient();

  const record = useMutation({
    mutationFn: () => recordCashPayment(invoiceId),
    onSuccess: () => {
      toast.success("Payment recorded — the membership is now active");
      queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not record the payment")),
  });

  // Exhaustive over PaymentMethod rather than a ternary on instapay. The
  // ternary read "in cash" for anything that was not InstaPay, so the moment
  // wallet existed this dialog was asking staff to confirm they had taken cash
  // for a mobile transfer — on the one screen in the app whose entire job is
  // to state, accurately, what money arrived and how.
  const HOW: Record<PaymentMethod, string> = {
    cash: "in cash",
    instapay: "by InstaPay transfer",
    wallet: "by mobile wallet transfer",
  };
  const how = HOW[method];

  return (
    <AlertDialog>
      {/* render=, not asChild — this project is on Base UI rather than Radix.
          Same pattern as SheetTrigger in mobile-nav and DropdownMenuTrigger in
          account-menu. */}
      <AlertDialogTrigger
        render={
          <button
            type="button"
            disabled={record.isPending}
            className="ui-action ui-action--sm inline-flex bg-primary px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover disabled:opacity-40"
          />
        }
      >
        {record.isPending ? "…" : "Confirm as paid"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Record {amount} received {how} for {invoiceNumber}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => record.mutate()}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
