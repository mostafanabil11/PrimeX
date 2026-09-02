require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const branches = mongoose.connection.db.collection('branches');

    // Written when there were three branches. There is one, so this is a
    // no-op that exists to keep sortOrder deterministic if more are ever added.
    await branches.updateOne({ slug: 'faiyum' }, { $set: { sortOrder: 1 } });

    console.log('Branch order updated');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
