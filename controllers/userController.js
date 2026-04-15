const User = require('../models/User'); 

exports.getPremiumPage = (req, res) => {
    res.render('premium', { user: req.user || null });
};

exports.upgradeToPremium = async (req, res) => {
    try {
        const { plan } = req.body; // 'monthly' | 'annual' | 'lifetime'
 
        let expiresAt = null;
        const now = new Date();
 
        if (plan === 'monthly') {
            expiresAt = new Date(now.setDate(now.getDate() + 30));
        } else if (plan === 'annual') {
            expiresAt = new Date(now.setDate(now.getDate() + 365));
        } else if (plan === 'lifetime') {
            expiresAt = null; 
        } else {
            expiresAt = null;
        }
 
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                isPremium: true,
                subscription: {
                    plan:        plan || 'lifetime',
                    activatedAt: new Date(),
                    expiresAt:   expiresAt
                }
            },
            { new: true }
        );
 
        res.status(200).json({
            success: true,
            message: `Welcome to Premium! Your ${plan} plan is now active.`,
            user: {
                isPremium:    user.isPremium,
                subscription: user.subscription
            }
        });
    } catch (err) {
        console.error('Upgrade error:', err);
        res.status(500).json({ success: false, message: 'Upgrade failed. Please try again.' });
    }
};
 
exports.cancelPremium = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            'subscription.cancelledAt': new Date()
        });
        res.json({ success: true, message: 'Subscription cancelled. Access continues until expiry.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Cancellation failed.' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const userId = req.user._id;

        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { username, email },
            { new: true, runValidators: true }
        );

        res.status(200).json({ 
            success: true, 
            message: 'Profile updated', 
            user: updatedUser 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};