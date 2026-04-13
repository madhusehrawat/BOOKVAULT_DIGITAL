const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName:  { type: String, default: 'Anonymous' },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const bookSchema = new mongoose.Schema({
    title:         { type: String, required: true },
    author:        { type: String, required: true },
    isbn:          { type: String, required: true, unique: true },
    category:      { type: String, required: true },
    description:   { type: String, default: 'No description available.' },
    price:         { type: Number, default: 0 },
    image:         { type: String, default: '/uploads/default-book.png' },

    // ── PDF ──────────────────────────────────────────────────────────────────
    // Relative path from /public, e.g.  uploads/pdf/1712345678-mybook.pdf
    // Set by the admin when uploading a book. Null = no PDF attached yet.
    pdfPath:       { type: String, default: null },

    // ── Premium gate ─────────────────────────────────────────────────────────
    // true  → only users with isPremium:true may download
    // false → any logged-in user may download
    isPremium:     { type: Boolean, default: false },

    isActive:      { type: Boolean, default: true },
    averageRating: { type: Number, default: 5 },
    reviews:       [reviewSchema]
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);