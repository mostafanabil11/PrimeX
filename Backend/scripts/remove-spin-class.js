/**
 * Fully removes the Spin class type from the live database: the class type
 * itself, both recurrence rules that generated it, and every session those
 * rules produced.
 *
 * Checked first, not assumed: zero bookings and zero reviews reference any
 * Spin session, so nothing is orphaned by deleting them outright. If either
 * count were non-zero this script would need to route through the app's own
 * cancel-session logic (refunds credits, notifies members) instead of a raw
 * delete — see BookingsService.releaseSessionBookings.
 *
 *   node scripts/remove-spin-class.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const classType = await db.collection('classtypes').findOne({ slug: 'spin' });
  if (!classType) {
    console.log('No Spin class type found — already removed.');
    await mongoose.disconnect();
    return;
  }

  const sessions = await db
    .collection('classsessions')
    .find({ classType: classType._id })
    .toArray();
  const sessionIds = sessions.map(s => s._id);

  const bookings = await db.collection('bookings').countDocuments({ session: { $in: sessionIds } });
  const reviews = await db.collection('reviews').countDocuments({ classType: classType._id });

  if (bookings > 0 || reviews > 0) {
    console.error(
      `Refusing to delete: ${bookings} booking(s) and ${reviews} review(s) still reference Spin. ` +
        'Route through the app (cancel each session / handle the reviews) rather than this script.'
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const rules = await db.collection('recurrencerules').deleteMany({ classType: classType._id });
  const sessionsDeleted = await db
    .collection('classsessions')
    .deleteMany({ classType: classType._id });
  await db.collection('classtypes').deleteOne({ _id: classType._id });

  console.log(`Deleted 1 class type, ${rules.deletedCount} recurrence rule(s), ${sessionsDeleted.deletedCount} session(s).`);

  await mongoose.disconnect();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
