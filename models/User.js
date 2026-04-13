const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Reader handle is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Vault ID (Email) is required"],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Secret key is required"],
        minlength: [8, "Secret key must be at least 8 characters"]
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    otpExpires: {
        type: Date,
        default: null
    },
    isPremium: {
        type: Boolean,
        default: false
    },

    // ── SUBSCRIPTION DETAILS ──────────────────────────────────────────────
    // Stores which plan the user bought and when it expires.
    // expiresAt: null  means lifetime (never expires)
    // plan: 'monthly' | 'annual' | 'lifetime'
    subscription: {
        plan:         { type: String, enum: ['monthly', 'annual', 'lifetime'], default: null },
        activatedAt:  { type: Date,   default: null },
        expiresAt:    { type: Date,   default: null },  // null = lifetime
        cancelledAt:  { type: Date,   default: null }
    },

    library: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }],
    pushSubscription: {
        type: Object,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

// ── AUTO-EXPIRE PREMIUM ───────────────────────────────────────────────────
// Called on every login via checkAuth/requireAuth to revoke expired plans.
userSchema.methods.checkPremiumExpiry = function () {
    if (!this.isPremium) return;
    const { expiresAt, cancelledAt } = this.subscription || {};
    // Lifetime plan (expiresAt null) never expires
    if (!expiresAt) return;
    // If subscription has expired, revoke premium
    if (new Date() > new Date(expiresAt)) {
        this.isPremium = false;
    }
};

// ── PASSWORD HASHING HOOK ─────────────────────────────────────────────────
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);