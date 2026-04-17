const express = require('express');
const router  = express.Router();
const push    = require('../controllers/pushController');
const { requireAuth, isAdmin } = require('../middleware/authMiddleware');
router.get('/vapid-public-key', push.getVapidKey);
router.post('/subscribe',requireAuth, push.saveSubscription);
router.post('/unsubscribe',requireAuth, push.removeSubscription);
router.post('/send-to-all',requireAuth, isAdmin, push.sendToAll);

module.exports = router;