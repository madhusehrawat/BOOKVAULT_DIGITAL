const User = require("../models/User");
const OtpStore = require("../models/OtpStore");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/sendotp");

// --- Pages ---
exports.getSignupPage = (req, res) => res.render("signup");

exports.getLoginPage = (req, res) => {
    const returnTo = req.query.returnTo || "";
    res.render("login", { returnTo });
};

exports.getForgotPasswordPage = (req, res) => res.render("forgot-password", { error: null });

// --- Signup Logic ---
exports.postSignup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "This email is already registered in the Vault." });
        }

        // 1. Send the OTP
        const otp = await sendOTP(normalizedEmail);
        
        // 2. We don't hash the password here yet because we need to store 
        // the plain password or the hash in OtpStore to create the user later.
        const hashedPassword = await bcrypt.hash(password, 10);

        await OtpStore.findOneAndUpdate(
            { email: normalizedEmail, type: "signup" },
            { otp, username, password: hashedPassword, createdAt: new Date() },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, message: "Security code dispatched to your inbox." });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, error: "Initialization failed. Please try again." });
    }
};

// --- Verify OTP & Account Creation ---
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // FIX: Search OtpStore, NOT User model (User doesn't exist yet!)
        const tempData = await OtpStore.findOne({ 
            email: normalizedEmail, 
            otp: otp.toString(), 
            type: "signup" 
        });

        if (!tempData) {
            // This triggers the "User not found" or "Invalid code" error
            return res.status(400).json({ success: false, error: "Verification sequence failed. Invalid or expired code." });
        }

        // 1. Move data from OtpStore to User collection
        const newUser = new User({
            username: tempData.username,
            email: tempData.email,
            password: tempData.password, // Already hashed in postSignup
            isVerified: true
        });

        await newUser.save();

        // 2. Cleanup: Remove temp data
        await OtpStore.deleteOne({ _id: tempData._id });

        res.status(200).json({ success: true });

    } catch (err) {
        console.error("❌ SERVER ERROR:", err);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

// --- Resend OTP ---
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: "Email is required." });
        
        const normalizedEmail = email.toLowerCase().trim();
        const otp = await sendOTP(normalizedEmail);
        
        await OtpStore.findOneAndUpdate(
            { email: normalizedEmail, type: "signup" },
            { otp, createdAt: new Date() }, 
            { upsert: true }
        );
        res.status(200).json({ success: true, message: "A fresh security code has been sent." });
    } catch (err) {
        res.status(500).json({ success: false, error: "Code transmission failed." });
    }
};

// --- Login Logic ---
exports.postLogin = async (req, res) => {
    try {
        const { email, password, subscription } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, error: "Invalid Vault credentials." });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || "vault_secret_key", 
            { expiresIn: "24h" }
        );

        if (subscription) {
            user.pushSubscription = subscription;
            await user.save();
        }

        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "Lax" // Changed to Lax for better redirect compatibility
        });

        const destination = user.role === "admin" ? "/admin/dashboard" : "/books";
        
        res.status(200).json({ 
            success: true, 
            redirectUrl: destination 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Vault authorization error." });
    }
};

// --- Password Recovery ---
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        
        if (!user) return res.status(200).json({ success: true, message: "If an account exists, a reset code was sent." });

        const resetOtp = await sendOTP(normalizedEmail);
        await OtpStore.findOneAndUpdate(
            { email: normalizedEmail, type: "password-reset" },
            { otp: resetOtp, createdAt: new Date() },
            { upsert: true }
        );
        res.status(200).json({ success: true, message: "Reset code dispatched." });
    } catch (err) {
        res.status(500).json({ success: false, error: "Error during recovery sequence." });
    }
};

exports.resetPasswordWithOTP = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const tempData = await OtpStore.findOne({ email: normalizedEmail, otp: otp.toString(), type: "password-reset" });
        if (!tempData) return res.status(400).json({ success: false, error: "Code has expired or is invalid." });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(404).json({ success: false, error: "Account no longer exists." });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        await OtpStore.deleteOne({ _id: tempData._id });
        res.status(200).json({ success: true, message: "Vault access updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Update failed." });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};