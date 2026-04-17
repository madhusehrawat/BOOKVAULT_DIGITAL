// controllers/pushController.js
const webpush = require('web-push');
const User    = require('../models/User');
require('dotenv').config();
webpush.setVapidDetails(
  'mailto:admin@bookvault.com', 
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.getVapidKey = (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(500).json({ success: false, message: 'VAPID keys not configured on server.' });
    }
    res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY });
};
exports.saveSubscription = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
        }
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
        res.json({ success: true, message: 'Push subscription saved.' });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.removeSubscription = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
        res.json({ success: true, message: 'Unsubscribed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.sendToAll = async (req, res) => {
    try {
        const { title, body, url, icon } = req.body;
        if (!title || !body) {
            return res.status(400).json({ success: false, message: 'title and body are required.' });
        }
        const payload = JSON.stringify({
            title: title || 'BookVault',
            body,
            url:url  || '/books',
            icon:icon || '/uploads/default-book.png',
            badge: '/uploads/default-book.png'
        });
        const users = await User.find({ pushSubscription: { $ne: null } });
        if (users.length === 0) {
            return res.json({ success: true, sent: 0, message: 'No subscribed users found.' });
        }
        let sent = 0, failed = 0;
        const promises = users.map(async (user) => {
            try {
                await webpush.sendNotification(user.pushSubscription, payload);
                sent++;
            } catch (err) {
                failed++;
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await User.findByIdAndUpdate(user._id, { pushSubscription: null });
                }
                console.error(`Push failed for ${user.email}:`, err.message);
            }
        });

        await Promise.allSettled(promises);
        res.json({ success: true, sent, failed, total: users.length });

    } catch (err) {
        console.error('Send-to-all error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendPushToUser = async (userId, payload) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushSubscription) return;

        await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired — remove it
            await User.findByIdAndUpdate(userId, { pushSubscription: null });
        }
        console.error('sendPushToUser error:', err.message);
    }
};
exports.sendNewBookNotification = async (book) => {
    try {
        const payload = JSON.stringify({
            title:'📚 New Book Added to BookVault!',
            body:`"${book.title}" by ${book.author} is now available in the vault.`,
            url:'/books',
            icon:book.image && book.image.startsWith('http') ? book.image : '/uploads/default-book.png',
            badge:'/uploads/default-book.png'
        });

        const users = await User.find({ pushSubscription: { $ne: null } });
        const promises = users.map(async (user) => {
            try {
                await webpush.sendNotification(user.pushSubscription, payload);
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await User.findByIdAndUpdate(user._id, { pushSubscription: null });
                }
            }
        });
        await Promise.allSettled(promises);
        console.log(`New book notification sent to ${users.length} users.`);
    } catch (err) {
        console.error('sendNewBookNotification error:', err.message);
    }
};