const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      // Compress the wire traffic to Atlas (zlib is built into Node, so no
      // extra package is needed). Any compressors=... in MONGODB_URI are
      // combined with this one; the server picks the first both sides support.
      compressors: ["zlib"],
    });

    console.log(
      `MongoDB connected successfully: ${connection.connection.host}`
    );
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDatabase;