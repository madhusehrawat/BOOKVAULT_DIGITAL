const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const bookController = require('../controllers/bookController');
const { requireAuth, requirePremium } = require('../middleware/authMiddleware');

// Memory storage — files are kept in buffer (req.files.X[0].buffer)
// so bookController.addBook can call uploadBufferToCloudinary()
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'bookPdf' && file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed'), false);
        }
        cb(null, true);
    },
});

// ─── Static routes (BEFORE /:id) ─────────────────────────────────────────────
router.get('/download-library', requireAuth, requirePremium, bookController.downloadLibraryPDF);
router.get('/my-library',       requireAuth, bookController.getMyLibrary);
router.get('/filter',           bookController.getAllBooks);
router.get('/',                 bookController.getAllBooks);

// Admin: add book — image + PDF uploaded to Cloudinary via buffer
router.post(
    '/add',
    requireAuth,
    (req, res, next) => {
        memoryUpload.fields([
            { name: 'bookImage', maxCount: 1 },
            { name: 'bookPdf',   maxCount: 1 },
        ])(req, res, (err) => {
            if (err) return res.status(400).json({ success: false, message: err.message });
            next();
        });
    },
    bookController.addBook
);

// ─── Dynamic routes ───────────────────────────────────────────────────────────
router.get('/:id/data',            requireAuth, bookController.getBookData);
router.get('/:id/pdf-url',         requireAuth, bookController.getPdfUrl);
router.get('/:id/download',        requireAuth, bookController.downloadBook);
router.post('/:id/toggle-library', requireAuth, bookController.toggleReadingList);
router.patch('/:id/status',        requireAuth, bookController.toggleStatus);
router.patch('/:id/premium',       requireAuth, bookController.togglePremium);
router.post('/review/:id',         requireAuth, bookController.postReview);
router.patch('/deactivate/:id',    requireAuth, bookController.deactivateBook);

module.exports = router;