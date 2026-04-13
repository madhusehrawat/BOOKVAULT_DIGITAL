const express= require('express');
const router  = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, checkAuth } = require('../middleware/authMiddleware');
const pageController = require('../controllers/pageController');

// GET  /premium      plans page (public, but shows "already premium" if logged in)
router.get('/premium', checkAuth, userController.getPremiumPage);
router.get('/profile', requireAuth, (req, res) => {
    res.render('profile', { user: req.user });
});
router.patch('/profile/update', requireAuth, userController.updateProfile);
router.get('/privacy', pageController.getPrivacyPolicy);


// POST /user/upgrade    — activate selected plan (requires login)
router.post('/user/upgrade', requireAuth, userController.upgradeToPremium);

// POST /user/cancel     — cancel subscription
router.post('/user/cancel', requireAuth, userController.cancelPremium);

module.exports = router;