// The complete set of editable copy on the site.
//
// Deliberately a fixed registry rather than a general page builder. Staff need
// to reword a headline without a deploy; they do not need to invent new
// sections, and letting them would mean every front-end component had to cope
// with content that might not be there. A known key either has a stored value
// or falls back to the default below, so a page can never render a hole.
//
// Adding a key here is the only way to add editable copy, which keeps the
// contract between the CMS and the components honest.

export const CONTENT_TYPES = ['text', 'longText', 'list'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export interface ContentDefinition {
  key: string;
  // Grouped so the admin screen can render one panel per page. 'site' is the
  // one group not tied to a single page — it renders in the layout shell
  // itself, so editing it changes copy everywhere at once.
  group: 'site' | 'home' | 'contact';
  label: string;
  type: ContentType;
  // Shown under the field in admin — why this copy exists, not what it says.
  hint?: string;
  maxLength: number;
  default: string | string[];
}

export const CONTENT_DEFINITIONS: ContentDefinition[] = [
  // --- Site-wide ---
  {
    key: 'site.announcementBar',
    group: 'site',
    label: 'Announcement bar',
    type: 'list',
    hint: 'Short claims shown in the strip under the header on every page. Three to five reads best; keep each under a few words.',
    maxLength: 60,
    default: [
      'Zero Excuses, Maximum Output',
      'Certified Coaches',
      'No Long Contracts',
      'Open 24/7',
    ],
  },

  // --- Home ---
  {
    key: 'home.hero.eyebrow',
    group: 'home',
    label: 'Hero eyebrow',
    type: 'text',
    hint: 'The small line above the headline.',
    maxLength: 80,
    default: 'Industrial strength discipline',
  },
  {
    key: 'home.hero.heading',
    group: 'home',
    label: 'Hero headline',
    type: 'text',
    hint: 'The first thing anyone reads. Short and declarative works best.',
    maxLength: 120,
    default: 'Break The Limit',
  },
  {
    key: 'home.hero.subheading',
    group: 'home',
    label: 'Hero subheading',
    type: 'longText',
    maxLength: 400,
    default:
      'Industrial strength discipline for those who refuse to settle. We build performance through raw intensity, unwavering commitment and zero friction utility.',
  },
  {
    key: 'home.intro.heading',
    group: 'home',
    label: 'Introduction headline',
    type: 'text',
    maxLength: 120,
    default: 'Zero Excuses. Maximum Output.',
  },
  {
    key: 'home.intro.body',
    group: 'home',
    label: 'Introduction body',
    type: 'longText',
    maxLength: 800,
    default:
      'Our environment is engineered for focus. No distractions, no unnecessary amenities. Just raw, unadulterated training space designed to forge unbreakable resilience.',
  },
  {
    key: 'home.facilities.heading',
    group: 'home',
    label: 'Facilities headline',
    type: 'text',
    maxLength: 120,
    default: 'The Facility',
  },
  {
    key: 'home.facilities.body',
    group: 'home',
    label: 'Facilities body',
    type: 'longText',
    maxLength: 800,
    default: 'Everything you need to get stronger, from elite machines to premium free weights.',
  },

  {
    // Group is 'home', not 'about': the /about page is gone but this list is
    // still what the homepage's "what makes the difference" section renders,
    // so it needs an editor and the About tab no longer exists to hold one.
    //
    // The KEY deliberately keeps its about.* prefix. Editors' saved values are
    // stored against it in content blocks, and renaming the key would orphan
    // whatever the gym has already written here.
    key: 'about.whyUs.items',
    group: 'home',
    label: 'Why choose us',
    type: 'list',
    hint: 'One short reason per line. Three to six reads best.',
    maxLength: 200,
    default: [
      'Coaches who are certified, not just enthusiastic',
      'Equipment maintained on a schedule, not when it breaks',
      'Classes capped so you get seen',
      'Open 24 hours, seven days a week',
    ],
  },

  // --- Contact ---
  {
    key: 'contact.intro',
    group: 'contact',
    label: 'Contact introduction',
    type: 'longText',
    maxLength: 600,
    default:
      'Questions about membership, classes or personal training? Send us a message and we will come back to you within one working day.',
  },
];

export const CONTENT_KEYS = CONTENT_DEFINITIONS.map(d => d.key);

const BY_KEY = new Map(CONTENT_DEFINITIONS.map(d => [d.key, d]));

export function getContentDefinition(key: string): ContentDefinition | undefined {
  return BY_KEY.get(key);
}
