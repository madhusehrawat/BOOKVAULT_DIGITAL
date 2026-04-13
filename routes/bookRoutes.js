const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requirePremium } = require('../middleware/authMiddleware');
const { uploadImage } = require('../config/cloudinary'); // ← Cloudinary

// ─── Static / specific routes (must come before /:id dynamic routes) ─────────
router.get('/download-library', requireAuth, requirePremium, bookController.downloadLibraryPDF);
router.get('/my-library',       requireAuth, bookController.getMyLibrary);
router.get('/filter',           bookController.getAllBooks);
router.get('/',                 bookController.getAllBooks);

// Admin: add book — cover image uploaded to Cloudinary, PDF handled separately
router.post(
    '/add',
    requireAuth,
    (req, res, next) => {
        // Upload cover image to Cloudinary; pdf is NOT uploaded here —
        // admin uploads PDF separately via /admin/books/:id/upload-pdf
        uploadImage.single('bookImage')(req, res, (err) => {
            if (err) return res.status(400).json({ success: false, message: err.message });
            next();
        });
    },
    bookController.addBook
);

// ─── Dynamic routes ───────────────────────────────────────────────────────────
router.post('/:id/toggle-library', requireAuth, bookController.toggleReadingList);
router.patch('/:id/status',        requireAuth, bookController.toggleStatus);
router.patch('/:id/premium',       requireAuth, bookController.togglePremium);
router.post('/review/:id',         requireAuth, bookController.postReview);
router.get('/:id/download',        requireAuth, bookController.downloadBook);
router.patch('/deactivate/:id',    requireAuth, bookController.deactivateBook);

module.exports = router;