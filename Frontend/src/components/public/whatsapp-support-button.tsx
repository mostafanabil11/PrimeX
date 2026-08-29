import { BRAND } from "@/lib/brand";
import { WhatsAppIcon, WhatsAppLink } from "./whatsapp";

/**
 * A persistent WhatsApp button, bottom-right on every page.
 *
 * WhatsApp is the default way an Egyptian gym is actually contacted — ahead of
 * the phone and well ahead of email — so it gets a fixed affordance rather
 * than being buried on the contact page.
 *
 * Sits below the admin surfaces in the stacking order and stays clear of the
 * viewport edge so it does not cover content on a phone.
 *
 * Keeps WhatsApp green while the social buttons opposite have gone neutral.
 * That is not an inconsistency: #25D366 is WhatsApp's own recognition colour
 * and is doing the same job an app icon does — people find this button by its
 * colour before they read anything. Restyling it to fit the palette would cost
 * more in recognition than it gains in tidiness. It is squared off like every
 * other surface here, which is as far as the brand should push it.
 */
export function WhatsAppSupportButton() {
  return (
    <WhatsAppLink
      message={`Hi ${BRAND.name}, I have a question.`}
      className="press fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center bg-[#25D366] text-black transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-6" />
      <span className="sr-only">Message {BRAND.name} on WhatsApp</span>
    </WhatsAppLink>
  );
}
