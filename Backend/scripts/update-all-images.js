require('dotenv').config();
const mongoose = require('mongoose');

// Only 'faiyum' still resolves — sheikh-zayed went when the gym consolidated to
// one site, and its image is kept only so this map is not a lie about what is
// on disk. The faiyum entry was 'maadi' pointing at branch-maadi-hero.jpg, both
// renamed by relocate-branch-to-faiyum.js.
const branchCovers = {
  'sheikh-zayed': ['/images/branch-sheikh-zayed-hero.jpg'],
  'faiyum': ['/images/branch-hero.jpg']
};

// NOTE: the field is `photo`, not `photoUrl`. `photoUrl` is not a path on the
// Trainer schema, so writing it left the real field null (nothing could set a
// trainer photo from the admin panel) and broke the production build, since
// `photoUrl` is not on the Trainer type either. It survived in dev only
// because the read path uses .lean(), which passes unknown keys through.
const trainerPhotos = {
  'marcus': '/images/trainer-marcus.jpg',
  'sarah': '/images/trainer-sarah.jpg',
  'david': '/images/trainer-david.jpg',
  'elena': '/images/trainer-elena.jpg',
  'omar': '/images/trainer-omar.jpg',
  'nour': '/images/trainer-nour.jpg'
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const branches = mongoose.connection.db.collection('branches');
    const trainers = mongoose.connection.db.collection('trainers');

    for (const [slug, images] of Object.entries(branchCovers)) {
      const res = await branches.updateOne({ slug: new RegExp(slug, 'i') }, { $set: { images } });
      console.log('Branch ' + slug + ': matched ' + res.matchedCount + ', modified ' + res.modifiedCount);
    }

    for (const [slug, photo] of Object.entries(trainerPhotos)) {
      const res = await trainers.updateOne({ slug: new RegExp(slug, 'i') }, { $set: { photo } });
      console.log('Trainer ' + slug + ': matched ' + res.matchedCount + ', modified ' + res.modifiedCount);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
