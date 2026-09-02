/**
 * Seeds the gym with a believable starting state: three Cairo branches, five
 * membership plans, nine class types, six trainers and six testimonials.
 *
 *   npm run seed:gym
 *
 * Idempotent. Every document is matched on its slug (or name, for
 * testimonials) and updated in place, so re-running refreshes the data rather
 * than duplicating it. Pass --fresh to delete the gym collections first, which
 * is what you want after changing a schema in a way that leaves stale fields.
 *
 * Deliberately does NOT touch users, subscriptions, invoices or bookings —
 * anything that represents a real person or a real payment. Re-running this
 * against production should be dull, not destructive.
 *
 * Prices are in minor units (piastres) and anchored to the Cairo market:
 * roughly 1,500 EGP monthly and 6,800 EGP annual, which is where Gold's Gym
 * Egypt and comparable operators sit.
 */
import { connect, disconnect, model, Model } from 'mongoose';
import * as dotenv from 'dotenv';
import { Branch, BranchSchema } from '@/branches/schemas/branch.schema';
import { Plan, PlanSchema } from '@/plans/schemas/plan.schema';
import { Trainer, TrainerSchema } from '@/trainers/schemas/trainer.schema';
import { ClassType, ClassTypeSchema } from '@/class-types/schemas/class-type.schema';
import { Testimonial, TestimonialSchema } from '@/content/schemas/testimonial.schema';

dotenv.config();

const FRESH = process.argv.includes('--fresh');

// The gym is open 24/7, every day of the week. The public site does not
// render this table (see contact/page.tsx), but the model stays in place for
// when per-branch hours matter again — see the comment on OpeningHours.
const standardHours = [
  { day: 'sunday', opensAt: '00:00', closesAt: '23:59' },
  { day: 'monday', opensAt: '00:00', closesAt: '23:59' },
  { day: 'tuesday', opensAt: '00:00', closesAt: '23:59' },
  { day: 'wednesday', opensAt: '00:00', closesAt: '23:59' },
  { day: 'thursday', opensAt: '00:00', closesAt: '23:59' },
  { day: 'friday', opensAt: '00:00', closesAt: '23:59' },
  { day: 'saturday', opensAt: '00:00', closesAt: '23:59' },
];

// The gym. Singular — there is one site and it is not a branch of anything,
// which is why nothing on the public site says the word "branch".
//
// This record used to describe an invented gym on Road 9 in Maadi, and that
// address was not a placeholder anybody would recognise as one: it reached the
// header, the footer, /contact and the page's structured data, so the site was
// confidently telling search engines and visitors to drive to the wrong
// governorate. The address below is the real one.
//
// STILL PLACEHOLDERS, and they print publicly — replace them with the real
// values or blank them: `phone`, `whatsappNumber` and `email` are all invented
// Cairo-shaped strings, and `images` points at a stock photo whose filename
// still says maadi. Coordinates are deliberately null rather than guessed: with
// no pin, mapsUrl() falls through to the googleMapsUrl below, which searches
// Maps for the gym by name — better than a coordinate guessed from a city
// name, which drops the marker in the wrong street with total confidence.
const BRANCHES = [
  {
    slug: 'faiyum',
    name: 'Faiyum',
    description:
      'Eight racks, a conditioning zone, a studio and a sauna. Calm, unhurried, and open around the clock.',
    // "Qesm Al Fayoum" is in the Google listing and is dropped here: it means
    // "Fayoum district", which First Al Faiyum and Faiyum Governorate already
    // say between them.
    addressLine: 'Gamal Abd El-Nasir Street',
    city: 'First Al Faiyum',
    governorate: 'Faiyum Governorate 63511',
    // Google Maps, searched by the name the listing still carries: the gym
    // traded as H2 before it was PrimeX and that is the name Google knows it
    // by, so searching "PrimeX" finds nothing and searching the street finds
    // the street.
    //
    // A SEARCH URL RATHER THAN A PIN, on purpose. The first link supplied for
    // this was a maps.app.goo.gl short link that turned out to be a directions
    // route rather than the place, and a short link cannot be read without
    // following it — there is no way to tell the two apart by looking. This
    // form is built from text, so it is verifiable by reading it and it cannot
    // silently be somebody's route home. If you want the exact pin instead,
    // open the H2 Gym listing, Share → Copy link, and paste that here: it
    // takes precedence over everything else in mapsUrl().
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=H2+Gym+Fayoum',
    latitude: null,
    longitude: null,
    phone: '+20 10 2059 8691',
    whatsappNumber: '+20 10 2059 8691',
    email: 'faiyum@primex.eg',
    facilities: [
      'Eight power racks',
      'Conditioning zone',
      'One studio',
      'Sauna',
      'Stretching area',
      'Juice bar',
    ],
    // Renamed from branch-maadi-hero.jpg. Nothing renders branch images today,
    // but the path was the last place the old city name survived in the data.
    images: ['/images/branch-hero.jpg'],
    openingHours: standardHours,
    womenOnlyWindows: [{ day: 'saturday', startsAt: '09:00', endsAt: '12:00' }],
    sortOrder: 1,
  },
];

/**
 * The pricing grid: four tiers, each sold over four terms.
 *
 * Written as tiers and terms rather than sixteen plan literals because that
 * is what it actually is — two axes — and a flat list of sixteen is where
 * inconsistencies breed: one cell keeps an old price, another is missing a
 * perk, and nobody notices until a member points at the website.
 *
 * Offers target the same two axes (see the Offer schema), so "30% off annual"
 * stays one record rather than four.
 */
const TERMS = [
  { months: 1, label: 'Monthly', slug: 'monthly' },
  { months: 3, label: '3 Months', slug: '3-months' },
  { months: 6, label: '6 Months', slug: '6-months' },
  { months: 12, label: 'Annual', slug: 'annual' },
] as const;

// Jacuzzi, sauna and InBody always move together in this gym's pricing, so
// they are generated from one number rather than repeated three times a cell.
const recovery = (n: number) =>
  n === 0
    ? []
    : [
        { label: 'Jacuzzi', value: n },
        { label: 'Sauna', value: n },
        { label: 'InBody', value: n },
      ];

const PLAN_TIERS = [
  {
    name: 'Starter',
    slug: 'starter',
    accessScope: 'gym_or_fitness' as const,
    daysPerWeek: 2,
    classAccess: { mode: 'none' as const, creditsPerCycle: 0 },
    description:
      'Two sessions a week, on the gym floor or in the studio — you pick which. Enough to build the habit without paying for days you will not use.',
    benefits: [
      'Gym floor or studio, your choice',
      'Two sessions a week',
      'Locker and towel service',
    ],
    cells: [
      { months: 1, price: 180000, sessions: 8, guestPasses: 1, recovery: 0, freezeDays: 0 },
      { months: 3, price: 498000, sessions: 24, guestPasses: 2, recovery: 0, freezeDays: 0 },
      { months: 6, price: 920000, sessions: 48, guestPasses: 3, recovery: 0, freezeDays: 0 },
      { months: 12, price: 1580000, sessions: 96, guestPasses: 4, recovery: 0, freezeDays: 0 },
    ],
  },
  {
    name: 'Go Pro',
    slug: 'go-pro',
    accessScope: 'gym_or_fitness' as const,
    daysPerWeek: 3,
    classAccess: { mode: 'none' as const, creditsPerCycle: 0 },
    description:
      'Three sessions a week, floor or studio. The step up for people who have stopped negotiating with themselves about turning up.',
    benefits: [
      'Gym floor or studio, your choice',
      'Three sessions a week',
      'Locker and towel service',
    ],
    cells: [
      { months: 1, price: 240000, sessions: 12, guestPasses: 1, recovery: 0, freezeDays: 0 },
      { months: 3, price: 660000, sessions: 36, guestPasses: 2, recovery: 0, freezeDays: 0 },
      { months: 6, price: 1220000, sessions: 72, guestPasses: 3, recovery: 0, freezeDays: 0 },
      { months: 12, price: 2160000, sessions: 144, guestPasses: 4, recovery: 0, freezeDays: 0 },
    ],
  },
  {
    name: 'Master',
    slug: 'master',
    accessScope: 'gym_plus_fitness' as const,
    daysPerWeek: 5,
    classAccess: { mode: 'unlimited' as const, creditsPerCycle: 0 },
    description:
      'Five days a week across the gym floor and the full class timetable, with recovery included. For people training seriously rather than occasionally.',
    benefits: [
      'Gym floor and every class',
      'Five sessions a week',
      'Jacuzzi, sauna and InBody scans',
      'Locker and towel service',
    ],
    cells: [
      { months: 1, price: 320000, sessions: 20, guestPasses: 1, recovery: 0, freezeDays: 0 },
      { months: 3, price: 880000, sessions: 60, guestPasses: 1, recovery: 1, freezeDays: 0 },
      { months: 6, price: 1640000, sessions: 120, guestPasses: 6, recovery: 5, freezeDays: 30 },
      { months: 12, price: 2880000, sessions: 240, guestPasses: 10, recovery: 10, freezeDays: 30 },
    ],
  },
  {
    name: 'Elite',
    slug: 'elite',
    accessScope: 'gym_plus_fitness' as const,
    daysPerWeek: null,
    classAccess: { mode: 'unlimited' as const, creditsPerCycle: 0 },
    description:
      'Every day, everything. The floor, every class on the timetable, jacuzzi, sauna and regular InBody scans. Nothing capped, nothing off limits.',
    benefits: [
      'Gym floor and every class',
      'Train every day, no session cap',
      'Jacuzzi, sauna and InBody scans',
      'Locker and towel service',
    ],
    cells: [
      { months: 1, price: 440000, sessions: null, guestPasses: 1, recovery: 1, freezeDays: 0 },
      { months: 3, price: 1200000, sessions: null, guestPasses: 3, recovery: 3, freezeDays: 0 },
      { months: 6, price: 2240000, sessions: null, guestPasses: 6, recovery: 6, freezeDays: 30 },
      { months: 12, price: 3960000, sessions: null, guestPasses: 12, recovery: 12, freezeDays: 30 },
    ],
  },
];

const PLANS = PLAN_TIERS.flatMap((tier, tierIndex) =>
  tier.cells.map(cell => {
    const term = TERMS.find(t => t.months === cell.months)!;

    return {
      slug: `${tier.slug}-${term.slug}`,
      name: `${tier.name} ${term.label}`,
      tier: tier.name,
      description: tier.description,
      benefits: tier.benefits,

      durationValue: cell.months,
      durationUnit: 'month',
      priceMinorUnits: cell.price,
      // Null everywhere: a standing sale price belongs in an Offer, which the
      // admin can schedule and switch off. This field stays for one-off
      // corrections rather than being the promotion mechanism.
      discountPriceMinorUnits: null,
      // The annual commitment waives the joining fee; everything else uses the
      // gym-wide default, which is what null means here.
      joiningFeeMinorUnits: cell.months === 12 ? 0 : null,

      classAccess: tier.classAccess,
      branchAccess: 'single',
      accessScope: tier.accessScope,
      sessionsIncluded: cell.sessions,
      daysPerWeek: tier.daysPerWeek,
      freezeDaysAllowed: cell.freezeDays,
      guestPasses: cell.guestPasses,
      perks: recovery(cell.recovery),

      // Tier first, then term, so the admin list reads in the same order as
      // the pricing page.
      sortOrder: tierIndex * 10 + TERMS.findIndex(t => t.months === cell.months),
      // Highlighted on whichever term the visitor has toggled to, which is why
      // this is set per tier rather than on one cell.
      isFeatured: tier.name === 'Master',
      isActive: true,
    };
  })
);

// Slugs from the pre-tier pricing. Deactivated rather than deleted on seed:
// subscriptions still point at them, and a dangling reference would be worse
// than a hidden document.
const RETIRED_PLAN_SLUGS = [
  'single-session',
  'monthly',
  'quarterly',
  'six-months',
  'annual',
  'student',
];

// The gym's real classes, from the timetable it supplied.
//
// Six of them, and no photographs yet — `image` is null on every one and the
// class card draws a placeholder icon in its place, so these can go live now
// and take their pictures later. When the photographs arrive, drop them in
// Frontend/public/images/ and run scripts/update-class-images.js rather than
// editing this file.
//
// durationMinutes and defaultCapacity are NOT on the supplied timetable — it
// gives days and start times only. 60 minutes matches the hourly grid it is
// laid out on, and 20 is the schema default. Both are worth confirming with
// the gym before this is treated as authoritative.
const CLASS_TYPES: {
  slug: string;
  name: string;
  description: string;
  image: string | null;
  intensity: number;
  durationMinutes: number;
  equipment: string[];
  defaultCapacity: number;
  colorToken: string | null;
  sortOrder: number;
}[] = [
  {
    slug: 'fitness',
    name: 'Fitness',
    description:
      'General strength and conditioning for every level. Coached through the movement, the load and the tempo, so you leave knowing what you did and why.',
    image: null,
    intensity: 3,
    durationMinutes: 60,
    equipment: ['Dumbbells', 'Barbell', 'Mat'],
    defaultCapacity: 20,
    colorToken: 'primary',
    sortOrder: 1,
  },
  {
    slug: 'aerobic',
    name: 'Aerobic',
    description:
      'Continuous low-impact cardio set to music. Builds stamina without the pounding, and the one to start on if you have been away from training for a while.',
    image: null,
    intensity: 3,
    durationMinutes: 60,
    equipment: ['Step', 'Mat'],
    defaultCapacity: 20,
    colorToken: 'chart-2',
    sortOrder: 2,
  },
  {
    slug: 'core-glutes',
    name: 'Core + Glutes',
    description:
      'Focused work on the midsection, hips and glutes. Short ranges, high control and the accessory work that most training programmes skip.',
    image: null,
    intensity: 3,
    durationMinutes: 60,
    equipment: ['Mat', 'Resistance bands', 'Dumbbells'],
    defaultCapacity: 20,
    colorToken: 'chart-4',
    sortOrder: 3,
  },
  {
    slug: 'kick-boxing',
    name: 'Kick Boxing',
    description:
      'Pads, combinations and footwork at pace. The hardest class on the timetable, and no previous striking experience is assumed.',
    image: null,
    intensity: 5,
    durationMinutes: 60,
    equipment: ['Gloves', 'Pads'],
    defaultCapacity: 20,
    colorToken: 'destructive',
    sortOrder: 4,
  },
  {
    slug: 'zumba',
    name: 'Zumba',
    description:
      'Latin-led dance cardio. Follow the coach, pick it up as you go, and get an hour of conditioning without counting a single rep.',
    image: null,
    intensity: 3,
    durationMinutes: 60,
    equipment: [],
    defaultCapacity: 25,
    colorToken: 'chart-5',
    sortOrder: 5,
  },
  {
    slug: 'belly-dance',
    name: 'Belly Dance',
    description:
      'Technique, isolation and posture, taught as a class rather than a workout — though it asks more of your core than most people expect.',
    image: null,
    intensity: 2,
    durationMinutes: 60,
    equipment: [],
    defaultCapacity: 25,
    // Shares Zumba's colour: both read as dance on the timetable, and they
    // never fall in the same cell.
    colorToken: 'chart-5',
    sortOrder: 6,
  },
];

const TRAINERS = [
  {
    slug: 'marcus-vance',
    name: 'Marcus Vance',
    photo: '/images/trainer-marcus.jpg',
    headline: 'Head of Strength',
    bio: 'Fifteen years under a barbell and eight coaching other people under theirs. Marcus ran the strength programme for two national teams before joining us, and still competes in raw powerlifting.',
    specialties: ['Powerlifting', 'Strength programming', 'Return from injury'],
    certifications: ['NSCA CSCS', 'IPF Level 2 Coach', 'FRC Mobility Specialist'],
    languages: ['English', 'Arabic'],
    yearsOfExperience: 15,
    hourlyRateMinorUnits: 90000,
    branchSlugs: ['faiyum'],
    availability: [
      { day: 'sunday', startsAt: '07:00', endsAt: '15:00' },
      { day: 'tuesday', startsAt: '07:00', endsAt: '15:00' },
      { day: 'thursday', startsAt: '07:00', endsAt: '15:00' },
    ],
    sortOrder: 1,
  },
  {
    slug: 'tarek-zaki',
    name: 'Tarek Zaki',
    photo: '/images/trainer-tarek.jpg',
    headline: 'Conditioning Lead',
    bio: 'Tarek came from competitive rowing and brought the engine with him. He writes our conditioning blocks and teaches the HIIT sessions people are quietly frightened of.',
    specialties: ['Conditioning', 'HIIT', 'Endurance'],
    certifications: ['ACE CPT', 'Precision Nutrition L1', 'British Rowing Coach'],
    languages: ['English'],
    yearsOfExperience: 9,
    hourlyRateMinorUnits: 75000,
    branchSlugs: ['faiyum'],
    availability: [
      { day: 'monday', startsAt: '06:00', endsAt: '13:00' },
      { day: 'wednesday', startsAt: '06:00', endsAt: '13:00' },
      { day: 'saturday', startsAt: '09:00', endsAt: '14:00' },
    ],
    sortOrder: 2,
  },
  {
    slug: 'david-kim',
    name: 'David Kim',
    photo: '/images/trainer-david.jpg',
    headline: 'Olympic Lifting Coach',
    bio: 'David spent a decade on the platform and now spends it beside one. Expect to be corrected often and to lift more than you did last month.',
    specialties: ['Olympic weightlifting', 'Technique', 'Youth athletes'],
    certifications: ['IWF Level 2', 'USAW Sports Performance'],
    languages: ['English', 'Korean'],
    yearsOfExperience: 12,
    hourlyRateMinorUnits: 85000,
    branchSlugs: ['faiyum'],
    availability: [
      { day: 'monday', startsAt: '15:00', endsAt: '21:00' },
      { day: 'wednesday', startsAt: '15:00', endsAt: '21:00' },
    ],
    sortOrder: 3,
  },
  {
    slug: 'youssef-darwish',
    name: 'Youssef Darwish',
    photo: '/images/trainer-youssef.jpg',
    headline: 'Mobility & Recovery',
    bio: 'A physiotherapist first and a coach second, which is why our heaviest lifters book him. Youssef runs mobility, recovery and the return-to-training work after injury.',
    specialties: ['Mobility', 'Injury rehabilitation', 'Yoga'],
    certifications: ['MSc Physiotherapy', 'RYT-500', 'FRC Mobility Specialist'],
    languages: ['English', 'Italian', 'Arabic'],
    yearsOfExperience: 11,
    hourlyRateMinorUnits: 80000,
    branchSlugs: ['faiyum'],
    availability: [
      { day: 'sunday', startsAt: '10:00', endsAt: '18:00' },
      { day: 'thursday', startsAt: '10:00', endsAt: '18:00' },
    ],
    sortOrder: 4,
  },
  {
    slug: 'omar-hassan',
    name: 'Omar Hassan',
    photo: '/images/trainer-omar.jpg',
    headline: 'Boxing Coach',
    bio: 'Egyptian national squad, twice. Omar teaches boxing the way he was taught it: footwork for a month before anyone throws a real punch.',
    specialties: ['Boxing', 'Footwork', 'Conditioning'],
    certifications: ['AIBA Level 2', 'Egyptian Boxing Federation Coach'],
    languages: ['Arabic', 'English'],
    yearsOfExperience: 14,
    hourlyRateMinorUnits: 70000,
    branchSlugs: ['faiyum'],
    availability: [
      { day: 'tuesday', startsAt: '16:00', endsAt: '22:00' },
      { day: 'saturday', startsAt: '10:00', endsAt: '16:00' },
    ],
    sortOrder: 5,
  },
  {
    slug: 'karim-fahmy',
    name: 'Karim Fahmy',
    photo: '/images/trainer-karim.jpg',
    headline: 'Coach, Beginners Programme',
    bio: 'Karim built our beginners programming from scratch and coaches most of it himself. Strength-led, unhurried, and completely unintimidating.',
    specialties: ['Strength for beginners', 'Technique', 'Nutrition coaching'],
    certifications: ['NASM CPT', 'Pre/Postnatal Coaching Certification', 'Precision Nutrition L1'],
    languages: ['Arabic', 'English'],
    yearsOfExperience: 7,
    hourlyRateMinorUnits: 65000,
    branchSlugs: ['faiyum'],
    availability: [
      { day: 'sunday', startsAt: '09:00', endsAt: '15:00' },
      { day: 'wednesday', startsAt: '09:00', endsAt: '15:00' },
    ],
    sortOrder: 6,
  },
];

const TESTIMONIALS = [
  {
    name: 'Ahmed Fouad',
    quote:
      'I had trained for six years and never learned to squat properly. Marcus fixed it in three sessions. My back has not hurt since.',
    attribution: 'Member since 2022',
    rating: 5,
    sortOrder: 1,
  },
  {
    name: 'Hazem Mansour',
    quote: 'The quiet hours are what got me through the door. The coaching is what kept me here.',
    attribution: 'Member since 2023',
    rating: 5,
    sortOrder: 2,
  },
  {
    name: 'Karim El-Sayed',
    quote:
      'Every other gym I joined felt like a showroom. This one feels like a workshop. The equipment is used and it is maintained.',
    attribution: 'Member since 2021',
    rating: 5,
    sortOrder: 3,
  },
  {
    name: 'Sherif Adel',
    quote:
      'Classes are capped, so the coach actually sees you. I have been corrected mid-set more times here than in four years anywhere else.',
    attribution: 'Member since 2023',
    rating: 5,
    sortOrder: 4,
  },
  {
    name: 'Youssef Ibrahim',
    quote:
      'I travel for work and train wherever I land. I have not found anywhere that holds this standard, which is rarer than it should be.',
    attribution: 'Member since 2020',
    rating: 5,
    sortOrder: 5,
  },
  {
    name: 'Tamer Nabil',
    quote:
      'Came back from a knee reconstruction. Youssef built the whole return around it and never once let me rush. I am lifting heavier now than before the injury.',
    attribution: 'Member since 2022',
    rating: 5,
    sortOrder: 6,
  },
];

// The Maadi document this file used to seed. Deactivated rather than deleted
// on the same reasoning as the retired plans above: memberships, enquiries and
// class instances may still reference it, and a dangling reference is worse
// than a hidden document. The public /branches list filters on isActive, so
// this is enough to take it off the site.
//
// RUN scripts/relocate-branch-to-faiyum.js BEFORE SEEDING A DATABASE THAT
// STILL HAS THIS DOCUMENT — production included. That script renames the
// record in place, so the seed below matches it on slug and every trainer,
// subscription, booking and enquiry keeps pointing at a live branch. Seeding
// first does something subtly worse than failing: it INSERTS a second branch
// (nothing has slug "faiyum" yet) and switches the old one off, leaving every
// one of those references attached to a deactivated document. This local
// database has already been relocated, so the line below matches nothing here
// and is kept for the environments that have not.
const RETIRED_BRANCH_SLUGS = ['maadi'];

async function upsertBySlug<T>(m: Model<T>, docs: Array<Record<string, unknown>>) {
  for (const doc of docs) {
    await m.findOneAndUpdate({ slug: doc.slug }, { $set: doc }, { upsert: true, new: true });
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  await connect(uri);

  const BranchModel = model(Branch.name, BranchSchema);
  const PlanModel = model(Plan.name, PlanSchema);
  const TrainerModel = model(Trainer.name, TrainerSchema);
  const ClassTypeModel = model(ClassType.name, ClassTypeSchema);
  const TestimonialModel = model(Testimonial.name, TestimonialSchema);

  if (FRESH) {
    await Promise.all([
      BranchModel.deleteMany({}),
      PlanModel.deleteMany({}),
      TrainerModel.deleteMany({}),
      ClassTypeModel.deleteMany({}),
      TestimonialModel.deleteMany({}),
    ]);
    console.log('--fresh: cleared branches, plans, trainers, class types and testimonials');
  }

  await upsertBySlug(BranchModel, BRANCHES);
  console.log(`branches      : ${BRANCHES.length}`);

  // Idempotent: a second run matches the same slugs and changes nothing.
  const retiredBranches = await BranchModel.updateMany(
    { slug: { $in: RETIRED_BRANCH_SLUGS } },
    { $set: { isActive: false } }
  );
  if (retiredBranches.modifiedCount > 0) {
    console.log(`retired branch: ${retiredBranches.modifiedCount} deactivated`);
  }

  await upsertBySlug(PlanModel, PLANS);
  console.log(`plans         : ${PLANS.length}`);

  // Anything sold under the old flat pricing is hidden rather than removed.
  // Idempotent: a second run matches the same slugs and changes nothing.
  const retired = await PlanModel.updateMany(
    { slug: { $in: RETIRED_PLAN_SLUGS } },
    { $set: { isActive: false } }
  );
  if (retired.modifiedCount > 0) {
    console.log(`retired plans : ${retired.modifiedCount} deactivated`);
  }

  await upsertBySlug(ClassTypeModel, CLASS_TYPES);
  console.log(`class types   : ${CLASS_TYPES.length}`);

  // Trainers reference branches by slug in this file so the seed stays
  // readable; the ids are resolved here, after the branches definitely exist.
  const branchIdBySlug = new Map<string, unknown>();
  for (const b of await BranchModel.find().select('_id slug').lean()) {
    branchIdBySlug.set((b as { slug: string }).slug, (b as { _id: unknown })._id);
  }

  for (const { branchSlugs, ...trainer } of TRAINERS) {
    const branches = branchSlugs.map(s => {
      const id = branchIdBySlug.get(s);
      if (!id) {
        throw new Error(`Trainer ${trainer.slug} references unknown branch "${s}"`);
      }
      return id;
    });

    await TrainerModel.findOneAndUpdate(
      { slug: trainer.slug },
      { $set: { ...trainer, branches } },
      { upsert: true, new: true }
    );
  }
  console.log(`trainers      : ${TRAINERS.length}`);

  // Testimonials have no slug, so they match on the quote — the name alone
  // would collide the day two members share one.
  for (const t of TESTIMONIALS) {
    await TestimonialModel.findOneAndUpdate({ quote: t.quote }, { $set: t }, { upsert: true });
  }
  console.log(`testimonials  : ${TESTIMONIALS.length}`);

  await disconnect();
  console.log('\nSeed complete.');
}

main().catch(async err => {
  console.error(err);
  await disconnect();
  process.exit(1);
});
