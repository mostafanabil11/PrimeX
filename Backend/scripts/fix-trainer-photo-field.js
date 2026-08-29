/**
 * Moves trainer photos from `photoUrl` onto the schema's real field, `photo`.
 *
 * A batch update wrote `photoUrl`, which is not a path on the Trainer schema.
 * It survived only because the read path uses .lean(), which passes unknown
 * keys straight through — so the site appeared to work while:
 *
 *   - `photo`, the field the schema, the DTO and the admin form all use, stayed
 *     null, so nobody could ever set or change a trainer photo from the admin
 *     panel;
 *   - the frontend read `trainer.photoUrl`, which is not on the Trainer type,
 *     giving 4 TypeScript errors and a failing production build.
 *
 * Copies the value across and drops the stray key.
 *
 *   node scripts/fix-trainer-photo-field.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const trainers = mongoose.connection.db.collection('trainers');

  const strays = await trainers.find({ photoUrl: { $exists: true } }).toArray();
  console.log(`found ${strays.length} trainer(s) with a stray photoUrl`);

  for (const t of strays) {
    await trainers.updateOne(
      { _id: t._id },
      { $set: { photo: t.photoUrl }, $unset: { photoUrl: '' } },
    );
    console.log(`  ${t.slug}: photo = ${t.photoUrl}`);
  }

  const remaining = await trainers.countDocuments({ photoUrl: { $exists: true } });
  const withPhoto = await trainers.countDocuments({ photo: { $ne: null } });
  console.log(`\nphotoUrl remaining: ${remaining} (want 0)`);
  console.log(`trainers with photo set: ${withPhoto}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
