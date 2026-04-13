const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName:  { type: String, required: true },
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    title:     { type: String, required: true },
    content:   { type: String, required: true },
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned:  { type: Boolean, default: false },
    replies:   [replySchema],
    createdAt: { type: Date, default: Date.now }
});

const communitySchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    bannerImage: { type: String, default: null },
    members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    posts:       [postSchema],

    // ── SUPER COMMUNITY ───────────────────────────────────────────────
    // isSuper: true  → shown with ⭐ star badge
    //                 → only admin + premium users can POST / REPLY
    //                 → all users can VIEW/READ
    //                 → admin uses it to announce new books, news etc.
    isSuper:     { type: Boolean, default: false },

    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt:   { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Community', communitySchema);