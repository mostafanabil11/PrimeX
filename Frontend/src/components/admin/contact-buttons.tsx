import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/public/whatsapp";
import { whatsappHref } from "@/lib/gym-format";

/**
 * Call and WhatsApp, side by side, for a member row in the back office.
 *
 * Extracted because it existed on the dashboard's "awaiting payment" list and
 * nowhere else — so the memberships table, which is where staff actually work
 * through unpaid invoices, had the member's phone number printed as text and no
 * way to act on it. Two copies of this would have drifted; one means the pair
 * looks and behaves the same wherever a member appears, which is the whole
 * point of the request that prompted it.
 *
 * The WhatsApp draft is passed in rather than built here. What staff are
 * opening the thread to say depends on the row — chasing an unpaid reservation
 * reads very differently from following up a settled one — and a component that
 * guessed would put the wrong words in their mouth. See lib/whatsapp-messages.
 */
export function AdminContactButtons({
  phone,
  name,
  message,
}: {
  /** Raw, as stored. Spaces are stripped for the tel: href. */
  phone: string;
  /** Used only for the accessible labels, so a screen reader announces which
   *  row's buttons these are rather than fourteen identical "Call" links. */
  name: string;
  message: string;
}) {
  return (
    <>
      <a
        href={`tel:${phone.replace(/\s/g, "")}`}
        aria-label={`Call ${name}`}
        className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex border border-border p-2 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <Phone className="size-4" strokeWidth={1.5} />
      </a>
      <a
        href={whatsappHref(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Message ${name} on WhatsApp`}
        className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex border border-border p-2 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <WhatsAppIcon className="size-4" />
      </a>
    </>
  );
}
