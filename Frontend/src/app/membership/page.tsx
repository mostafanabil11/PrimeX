import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, ChevronDown, CreditCard } from "lucide-react";
import { getPlansServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { CtaButton, EmptyState, Eyebrow } from "@/components/public/section";
import { WhatsAppCta, WhatsAppIcon } from "@/components/public/whatsapp";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { MembershipPlans, MembershipComparison } from "@/components/public/membership-plans";
import styles from "./membership.module.css";

export const metadata: Metadata = {
  title: pageTitle("Membership"),
  description: "Compare Starter, Go Pro, Master and Elite memberships. Choose your term and reserve with the PrimeX team on WhatsApp. No online payment.",
  alternates: { canonical: "/membership" },
};

export default async function MembershipPage() {
  const [plans, t, locale] = await Promise.all([getPlansServer(), getTranslations("Membership"), getLocale()]);

  return (
    <div className={styles.page} data-no-translate>
      <header className={styles.hero}>
        <div className={styles.container}>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-4 font-display text-5xl leading-[.95] tracking-[-0.02em] uppercase md:text-7xl">
            {t.rich("heading", { accent: (chunks) => <span className="text-primary">{chunks}</span> })}
          </h1>
          <p className={styles.introduction}>{t("intro")}</p>
          <ul className={styles.reassurance}>
            <li><WhatsAppIcon className="size-4" />{t("whatsappReservation")}</li>
            <li><CreditCard aria-hidden className="size-4" />{t("noOnlinePayment")}</li>
            <li><Check aria-hidden className="size-4" />{t("staffActivation")}</li>
          </ul>
        </div>
      </header>

      <section className={`${styles.container} ${styles.planSection}`} aria-labelledby="membership-plans-title">
        <div className={styles.sectionHeading}>
          <h2 id="membership-plans-title" className="font-display text-3xl uppercase">{t("plansHeading")}</h2>
          <p>{t("plansIntro")}</p>
        </div>
        {plans.length === 0 ? <EmptyState message={t("empty")} /> : <>
          <MembershipPlans plans={plans} />
          <div className="mt-6"><MembershipComparison plans={plans} /></div>
        </>}
      </section>

      <section className={`${styles.container} ${styles.faqSection}`} aria-labelledby="membership-faq-title">
        <div className={styles.sectionHeading}>
          <h2 id="membership-faq-title" className="font-display text-3xl uppercase">{t("faqHeading")}</h2>
          <p>{t("faqIntro")}</p>
        </div>
        <div className={styles.faqGrid}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <details key={index} className={styles.faq}>
              <summary><span>{t(`faq${index}Question`)}</span><ChevronDown aria-hidden className="size-4 shrink-0" /></summary>
              <p>{t(`faq${index}Answer`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${styles.container} ${styles.helpSection}`}>
        <div className={styles.help}>
          <div>
            <h2 className="font-display text-3xl uppercase">{t("helpHeading")}</h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">{t("helpBody")}</p>
          </div>
          <div className={styles.helpActions}>
            <WhatsAppCta message={joinEnquiry(locale)}>{t("askWhatsapp")}</WhatsAppCta>
            <CtaButton href="/contact" variant="outline">{t("contact")}</CtaButton>
          </div>
        </div>
      </section>
    </div>
  );
}
