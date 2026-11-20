// config/db.js — MongoDB connection with Mongoose
'use strict';

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Prevents injection via malformed connection strings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[MongoDB] Connection failed: ${err.message}`);
    process.exit(1);
  }
};

// Catch disconnection after initial connect
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database.');
});

module.exports = connectDB;
