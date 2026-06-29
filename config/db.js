const mongoose = require("mongoose");

const connectDb = async () => {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }

  try {
    const connection = await mongoose.connect(url, {
      maxPoolSize: 20,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
      maxIdleTimeMS: 30000,
      compressors: 'zlib'
    });
    console.log("Database Connected Successfully");
    return connection;
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDb;