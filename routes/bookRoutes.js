const express = require('express');
const router  = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requirePremium } = require('../middleware/authMiddleware');
const { uploadFields } = require('../config/cloudinary');

// ─── Static / specific routes (BEFORE /:id) ──────────────────────────────────
router.get('/download-library', requireAuth, requirePremium, bookController.downloadLibraryPDF);
router.get('/my-library',       requireAuth, bookController.getMyLibrary);
router.get('/filter',           bookController.getAllBooks);
router.get('/',                 bookController.getAllBooks);

// Admin: add book — image + PDF both uploaded to Cloudinary in one request
router.post(
    '/add',
    requireAuth,
    (req, res, next) => {
        uploadFields(req, res, (err) => {
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