require("dotenv").config();
const mongoose = require("mongoose");

const classImages = {
  "strength-foundations": "/images/class-strength-foundations.jpg",
  "hiit-inferno": "/images/class-hiit-inferno.jpg",
  "olympic-lifting": "/images/class-olympic-lifting.jpg",
  "metabolic-conditioning": "/images/class-metabolic-conditioning.jpg",
  "mobility-core": "/images/class-mobility-core.jpg",
  "boxing": "/images/class-boxing.jpg",
  "spin": "/images/class-spin.jpg",
  "yoga": "/images/class-yoga.jpg",
  "functional-circuit": "/images/class-functional-circuit.jpg",
  "recovery-stretch": "/images/class-recovery-stretch.jpg"
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
