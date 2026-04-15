const express        = require('express');
const router         = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requirePremium, checkAuth } = require('../middleware/authMiddleware');
const multer         = require('multer');

// memoryStorage — files uploaded to Cloudinary, not local disk
// Works on Render's ephemeral filesystem
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'bookPdf' && file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed'), false);
        }
        cb(null, true);
    }
});

// ── Static / specific routes ───────────────────────────────────────────────
router.get('/download-library', requireAuth, requirePremium, bookController.downloadLibraryPDF);
router.get('/my-library',       requireAuth, bookController.getMyLibrary);
router.get('/filter',           bookController.getAllBooks);
router.get('/',                 bookController.getAllBooks);

// Admin dashboard shortcut
router.get('/admin', requireAuth, async (req, res) => {
    const Book  = require('../models/Book');
    const books = await Book.find();
    res.render('admin/dashboard', { books, user: req.user });
});

// Add book — both image + pdf go to Cloudinary via buffer
router.post(
    '/add',
    requireAuth,
    upload.fields([{ name: 'bookImage', maxCount: 1 }, { name: 'bookPdf', maxCount: 1 }]),
    bookController.addBook
);

// ── Dynamic routes ─────────────────────────────────────────────────────────
router.get('/:id/data',            bookController.getBookData);
router.get('/:id/pdf-url',         requireAuth, bookController.getPdfUrl);   // inline viewer URL
router.post('/:id/toggle-library', requireAuth, bookController.toggleReadingList);
router.patch('/:id/status',        requireAuth, bookController.toggleStatus);
router.patch('/:id/premium',       requireAuth, bookController.togglePremium);
router.post('/review/:id',         requireAuth, bookController.postReview);
router.get('/:id/download',        requireAuth, bookController.downloadBook);
router.patch('/deactivate/:id',    requireAuth, bookController.deactivateBook);

module.exports = router;