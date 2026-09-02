import { ArrowUpRight, MapPin, Navigation, Phone } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { BRAND } from "@/lib/brand";
import { fullAddress, mapsUrl } from "@/lib/gym-format";
import type { Branch } from "@/types/gym";
import { SOCIAL_LINKS } from "./floating-contact";
import { Section } from "./section";
import styles from "./home-connect.module.css";

function mapEmbedUrl(branch: Branch, locale: string): string {
  // Use the same place query as Directions, rather than pinning the whole street.
  let query = fullAddress(branch);
  if (branch.latitude != null && branch.longitude != null) {
    query = `${branch.latitude},${branch.longitude}`;
  }
  if (branch.googleMapsUrl) {
    try {
      const link = new URL(branch.googleMapsUrl);
      query = link.searchParams.get("query") ?? link.searchParams.get("q") ?? query;
    } catch {
      // An old or incomplete link must not take the address/map off the page.
    }
  }
  return `https://maps.google.com/maps?${new URLSearchParams({ q: query, hl: locale === "ar" ? "ar" : "en", z: "16", output: "embed" })}`;
}

export function VisitUsSection({ branch, locale }: { branch: Branch | null; locale: string }) {
  if (!branch) return null;
  const ar = locale === "ar";
  const address = fullAddress(branch);
  const displayedAddress = ar && address === "Gamal Abd El-Nasir Street, First Al Faiyum, Faiyum Governorate 63511"
    ? "شارع جمال عبد الناصر، قسم الفيوم، محافظة الفيوم ٦٣٥١١"
    : address;

  return (
    <Section id="visit-us" className={styles.visitSection}>
      <div className={styles.visitCard}>
        <div className={styles.mapPanel}>
          <iframe
            src={mapEmbedUrl(branch, locale)}
            title={ar ? `موقع ${BRAND.name} في الفيوم` : `${BRAND.name} location in Fayoum`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={styles.mapFrame}
            allowFullScreen
          />
        </div>

        <div className={styles.visitDetails}>
          <p className={`${styles.eyebrow} font-mono`}>
            {ar ? "مكانك هنا" : "Your next stop"}
          </p>
          <h2 className={`${styles.heading} font-display`}>
            {ar ? "زورنا" : "Visit us"}<span className={styles.accent}>.</span>
          </h2>
          <span className={styles.rule} aria-hidden="true" />

          <address className={styles.address}>
            <MapPin aria-hidden="true" size={18} strokeWidth={1.6} />
            <span>{displayedAddress}</span>
          </address>
          <a href={`tel:${BRAND.whatsapp.replace(/\s/g, "")}`} className={styles.phone}>
            <Phone aria-hidden="true" size={17} strokeWidth={1.6} />
            <span dir="ltr">{BRAND.whatsapp}</span>
          </a>

          <div className={styles.hours}>
            <h3 className={`${styles.eyebrow} font-mono`}>{ar ? "مواعيد العمل" : "Opening hours"}</h3>
            <div className={styles.hoursRow}>
              <span>{ar ? "طوال أيام الأسبوع" : "Every day of the week"}</span>
              <span className={`${styles.hoursBadge} font-mono`} dir="ltr">24/7</span>
            </div>
            <p>{ar ? "تدرّب في الوقت المناسب لك." : "Train on your schedule."}</p>
          </div>

          <ActionButton href={mapsUrl(branch)} target="_blank" rel="noopener noreferrer" fullWidth className={styles.directions}>
            <Navigation aria-hidden="true" className="size-4" strokeWidth={1.8} />
            {ar ? "الاتجاهات إلى الجيم" : "Get directions"}
          </ActionButton>
        </div>
      </div>
    </Section>
  );
}

export function FollowUsSection({ locale }: { locale: string }) {
  if (SOCIAL_LINKS.length === 0) return null;
  const ar = locale === "ar";

  return (
    <Section id="follow-us" className={styles.followSection}>
      <div className={styles.followInner}>
        <p className={`${styles.eyebrow} font-mono`}>{ar ? "ابقَ على تواصل" : "Stay connected"}</p>
        <h2 className={`${styles.heading} font-display`}>
          {ar ? "تابعنا" : "Follow us"}<span className={styles.accent}>.</span>
        </h2>
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.followCopy}>
          {ar ? "من داخل الجيم، إلى آخر الأخبار. كن جزءاً من مجتمع برايم إكس." : "Inside the gym. Beyond the workout. Be part of PrimeX."}
        </p>

        <div className={styles.socialGrid}>
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ar ? `تابع ${BRAND.name} على ${social.label} (يفتح في تبويب جديد)` : `Follow ${BRAND.name} on ${social.label} (opens in a new tab)`}
              className={styles.socialCard}
            >
              <ArrowUpRight aria-hidden="true" className={styles.externalArrow} strokeWidth={1.5} />
              <span className={styles.socialIcon}>{social.icon}</span>
              <span className={`${styles.socialLabel} font-mono`} data-no-translate>{social.label}</span>
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}
