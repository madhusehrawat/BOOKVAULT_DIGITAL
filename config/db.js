// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // These options help give clearer errors
            serverSelectionTimeoutMS: 5000 
        }); // no extra options needed
        console.log("MongoDB connected successfully!");
    } catch (err) {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    }
};

module.exports = connectDB;