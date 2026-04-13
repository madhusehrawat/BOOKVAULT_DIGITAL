// models/OtpStore.js
const mongoose = require("mongoose");

const otpStoreSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ["signup", "password-reset"], default: "signup" },
    username: { type: String },         // only for signup
    password: { type: String },         // hashed, only for signup
    expires: { type: Date, required: true }
});

// MongoDB will auto-delete documents once 'expires' is reached
otpStoreSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpStore", otpStoreSchema);