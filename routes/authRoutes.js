const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- GET Routes (Pages) ---

// Render the Signup/Registration page
router.get('/signup', authController.getSignupPage);

// Render the Login/Access page
router.get('/login', authController.getLoginPage);

// Render the Password Recovery request page
router.get('/forgot-password', authController.getForgotPasswordPage);

// Render the OTP Verification page (ensure this EJS is in your views)
router.get('/verify-otp', (req, res) => res.render('verify-otp'));

// Handle account logout and cookie clearance
router.get('/logout', authController.logout);


// --- POST Routes (Logic) ---

// Process initial registration and send OTP
router.post('/signup', authController.postSignup);

// Validate OTP and create the user account
router.post('/verify-otp', authController.verifyOTP);

// Resend a fresh OTP if the previous one expired
router.post('/resend-otp', authController.resendOTP);

// Authorize user and set session cookie
router.post('/login', authController.postLogin);

// Process password reset request and send recovery code
router.post('/forgot-password', authController.forgotPassword);

// Verify recovery OTP and update to new password
router.post('/reset-password', authController.resetPasswordWithOTP);


module.exports = router;