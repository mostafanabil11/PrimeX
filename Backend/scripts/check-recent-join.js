/**
 * Diagnostic: did the most recent join actually confirm server-side?
 *
 *   node scripts/check-recent-join.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const invoices = await db
    .collection('invoices')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  console.log('--- 5 most recent invoices ---');
  for (const i of invoices) {
    console.log(
      [
        i.invoiceNumber,
        `status=${i.paymentStatus}`,
        `method=${i.paymentMethod}`,
        `total=${i.totalMinorUnits}`,
        `paidAt=${i.paidAt ? i.paidAt.toISOString() : 'null'}`,
        `paymobOrderId=${i.paymobOrderId ?? 'null'}`,
        `sub=${i.subscription ?? 'null'}`,
        `created=${i.createdAt ? i.createdAt.toISOString() : '?'}`,
      ].join('  ')
    );
  }

  const subs = await db
    .collection('subscriptions')
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  console.log('\n--- 5 most recent subscriptions ---');
  for (const s of subs) {
    console.log(
      [
        s.planSnapshot?.name ?? '?',
        `status=${s.status}`,
        `member=${s.member}`,
        `created=${s.createdAt ? s.createdAt.toISOString() : '?'}`,
      ].join('  ')
    );
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
