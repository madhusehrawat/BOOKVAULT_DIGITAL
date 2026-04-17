
const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPremium:    { type: Boolean, default: false },
    role:         { type: String, default: 'user' },
    subscription: { type: Object, required: true },  // raw PushSubscription JSON
    createdAt:    { type: Date, default: Date.now }
});
pushSubscriptionSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);