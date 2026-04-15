const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/signup', authController.getSignupPage);
router.get('/login', authController.getLoginPage);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.get('/verify-otp', (req, res) => res.render('verify-otp'));
router.get('/logout', authController.logout);
router.post('/signup', authController.postSignup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', authController.postLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPasswordWithOTP);

module.exports = router;