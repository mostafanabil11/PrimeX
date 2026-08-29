/**
 * Applies the trainer and testimonial renames to an existing database.
 *
 * The seed cannot do this on its own. It upserts by slug (trainers) and by
 * name (testimonials), so re-running it after a rename would leave the old
 * documents in place and insert the new ones alongside — six trainers become
 * nine, and the site shows both. This renames in place instead.
 *
 * Idempotent: every update is keyed on the OLD identifier, so a second run
 * matches nothing and changes nothing.
 *
 *   node scripts/apply-trainer-testimonial-rename.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Keyed on the real slugs. A previous attempt at this used 'sarah', 'elena'
// and 'nour', which match no document — the actual slugs carry surnames — and
// it reported success anyway after matching zero rows.
const TRAINERS = [
  {
    from: 'sarah-james',
    set: {
      slug: 'tarek-zaki',
      name: 'Tarek Zaki',
      photo: '/images/trainer-tarek.jpg',
      bio: 'Tarek came from competitive rowing and brought the engine with him. He writes our conditioning blocks and teaches the HIIT sessions people are quietly frightened of.',
    },
  },
  {
    from: 'elena-rossi',
    set: {
      slug: 'youssef-darwish',
      name: 'Youssef Darwish',
      photo: '/images/trainer-youssef.jpg',
      bio: 'A physiotherapist first and a coach second, which is why our heaviest lifters book him. Youssef runs mobility, recovery and the return-to-training work after injury.',
    },
  },
  {
    from: 'nour-abdelrahman',
    set: {
      slug: 'karim-fahmy',
      name: 'Karim Fahmy',
      photo: '/images/trainer-karim.jpg',
      // Role and specialties change too, not just the name: this seat was
      // "Coach, Women's Programme" with pre/postnatal coaching, which does
      // not transfer.
      headline: 'Coach, Beginners Programme',
      bio: 'Karim built our beginners programming from scratch and coaches most of it himself. Strength-led, unhurried, and completely unintimidating.',
      specialties: ['Strength for beginners', 'Technique', 'Nutrition coaching'],
    },
  },
];

// Two of these need the quote rewritten, not just the name. One was entirely
// about the women-only hours; the other credits a trainer who has been
// renamed.
const TESTIMONIALS = [
  {
    from: 'Layla Mansour',
    set: {
      name: 'Hazem Mansour',
      quote:
        'The quiet hours are what got me through the door. The coaching is what kept me here.',
    },
  },
  { from: 'Mona Adel', set: { name: 'Sherif Adel' } },
  {
    from: 'Farida Nabil',
    set: {
      name: 'Tamer Nabil',
      quote:
        'Came back from a knee reconstruction. Youssef built the whole return around it and never once let me rush. I am lifting heavier now than before the injury.',
    },
  },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  let changed = 0;

  for (const { from, set } of TRAINERS) {
    const res = await db.collection('trainers').updateOne({ slug: from }, { $set: set });
    console.log(`trainer ${from} -> ${set.slug}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
    changed += res.modifiedCount;
  }

  for (const { from, set } of TESTIMONIALS) {
    const res = await db.collection('testimonials').updateOne({ name: from }, { $set: set });
    console.log(`testimonial ${from} -> ${set.name}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
    changed += res.modifiedCount;
  }

  // Prove the end state rather than trusting the counts above.
  const trainers = await db
    .collection('trainers')
    .find({}, { projection: { name: 1, slug: 1, _id: 0 } })
    .sort({ sortOrder: 1 })
    .toArray();
  const testimonials = await db
    .collection('testimonials')
    .find({}, { projection: { name: 1, _id: 0 } })
    .toArray();

  console.log(`\ndocuments changed: ${changed}`);
  console.log('trainers now:', trainers.map(t => t.name).join(', '));
  console.log('testimonials now:', testimonials.map(t => t.name).join(', '));

  await mongoose.disconnect();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
