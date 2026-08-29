require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const branches = mongoose.connection.db.collection('branches');

    await branches.updateOne({ slug: 'maadi' }, { $set: { sortOrder: 1 } });
    await branches.updateOne({ slug: 'sheikh-zayed' }, { $set: { sortOrder: 2 } });
    await branches.updateOne({ slug: 'new-cairo' }, { $set: { sortOrder: 3 } });

    console.log('Branch order updated');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
