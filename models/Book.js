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
    // pdfPath     = full Cloudinary HTTPS URL (used for redirect download)
    // pdfPublicId = Cloudinary public_id (used to delete the file later)
    pdfPath:       { type: String, default: null },
    pdfPublicId:   { type: String, default: null },
    isPremium:     { type: Boolean, default: false },
    isActive:      { type: Boolean, default: true },
    averageRating: { type: Number, default: 5 },
    reviews:       [reviewSchema]
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);