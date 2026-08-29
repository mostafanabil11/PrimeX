/**
 * schema.org JSON-LD.
 *
 * Every payload here is built from data this app owns — brand constants, or
 * documents fetched from our own API — never from anything a visitor can
 * type. That is what makes dangerouslySetInnerHTML safe in this one place,
 * and it is the reason to keep the serialisation behind this component
 * rather than repeating the raw script tag on each page.
 *
 * The gym runs from one site (see contact/page.tsx), so there is no
 * per-location HealthClub block to emit separately — this is the whole thing.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * The organisation itself, on the homepage.
 *
 * Typed as HealthClub rather than plain Organization: it is the more specific
 * type, and search engines use it to place the business in the right category.
 *
 * The address sits directly on the club rather than under `department`. That
 * nesting is how schema.org models a business with several sites, and it is
 * the wrong shape for one — a single gym filed as a department of itself
 * gives search engines a location they cannot attribute to the business, which
 * is the opposite of what local SEO needs. Written to take the list anyway, so
 * a second site is a rendering change rather than a signature change.
 */
export function OrganizationSchema({
  name,
  description,
  siteUrl,
  logoUrl,
  branches,
}: {
  name: string;
  description: string;
  siteUrl: string;
  logoUrl: string;
  branches: Array<{
    name: string;
    addressLine: string;
    city: string;
    governorate: string;
    phone: string | null;
  }>;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'HealthClub',
        name,
        description,
        url: siteUrl,
        logo: logoUrl,
        image: logoUrl,
        // Open around the clock, every day — a brand fact rather than a
        // per-branch one while the gym runs a single site. 23:59 rather than
        // 24:00: Google's rich-results parser reads 00:00–00:00 as closed.
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: '00:00',
          closes: '23:59',
        },
        ...(branches[0]
          ? {
              address: {
                '@type': 'PostalAddress',
                streetAddress: branches[0].addressLine,
                addressLocality: branches[0].city,
                addressRegion: branches[0].governorate,
                addressCountry: 'EG',
              },
              ...(branches[0].phone ? { telephone: branches[0].phone } : {}),
            }
          : {}),
      }}
    />
  );
}

/**
 * The FAQ page.
 *
 * This is the one with the most direct payoff: a valid FAQPage block is what
 * lets the questions appear as expandable results in search, and the page
 * already carries around thirty of them written as plain question/answer
 * pairs.
 *
 * Answers must be plain text, so the caller passes a text-only version rather
 * than the React nodes the page renders — a JSX answer containing a link has
 * no meaningful string form, and stringifying it would emit component
 * internals into the page.
 */
export function FaqSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }}
    />
  );
}

/** A trainer profile, so a search for the coach by name can find them here. */
export function PersonSchema({
  name,
  jobTitle,
  description,
  imageUrl,
  profileUrl,
  worksForName,
  knowsAbout,
}: {
  name: string;
  jobTitle: string | null;
  description: string | null;
  imageUrl: string | null;
  profileUrl: string;
  worksForName: string;
  knowsAbout: string[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        url: profileUrl,
        ...(jobTitle ? { jobTitle } : {}),
        ...(description ? { description } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(knowsAbout.length > 0 ? { knowsAbout } : {}),
        worksFor: { '@type': 'HealthClub', name: worksForName },
      }}
    />
  );
}
