require("dotenv").config();
const mongoose = require("mongoose");

// slug -> public image path, e.g. "power-yoga": "/images/class-power-yoga.jpg".
//
// EMPTY ON PURPOSE. This mapped the nine placeholder classes to the
// public/images/class-*.jpg files that were deleted along with them, so every
// entry pointed at a file that is gone and a slug that no longer exists.
//
// The script itself is kept rather than deleted: it is the tool for the real
// class photographs when they arrive. Drop the files into
// Frontend/public/images/, list them here, and run
//   node scripts/update-class-images.js
// It only ever sets `image` on classes that already exist, so it is safe to
// re-run and will report any slug it cannot find.
const classImages = {
};

async function updateClassImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("classtypes");

    for (const [slug, imagePath] of Object.entries(classImages)) {
      const result = await collection.updateOne(
        { slug },
        { $set: { image: imagePath } }
      );
      if (result.matchedCount > 0) {
        console.log(`Updated class '${slug}' with image ${imagePath}`);
      } else {
        console.log(`Class '${slug}' not found.`);
      }
    }

    console.log("All class types updated successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

updateClassImages();
