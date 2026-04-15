const express        = require('express');
const router         = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requirePremium, checkAuth } = require('../middleware/authMiddleware');
const multer         = require('multer');

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

router.get('/download-library', requireAuth, requirePremium, bookController.downloadLibraryPDF);
router.get('/my-library', requireAuth, bookController.getMyLibrary);
router.get('/filter',  bookController.getAllBooks);
router.get('/', bookController.getAllBooks);

router.get('/admin', requireAuth, async (req, res) => {
    const Book  = require('../models/Book');
    const books = await Book.find();
    res.render('admin/dashboard', { books, user: req.user });
});

router.post(
    '/add',
    requireAuth,
    upload.fields([{ name: 'bookImage', maxCount: 1 }, { name: 'bookPdf', maxCount: 1 }]),
    bookController.addBook
);

router.get('/:id/data',bookController.getBookData);
router.post('/:id/toggle-library', requireAuth, bookController.toggleReadingList);
router.patch('/:id/status', requireAuth, bookController.toggleStatus);
router.patch('/:id/premium', requireAuth, bookController.togglePremium);
router.post('/review/:id', requireAuth, bookController.postReview);
router.get('/:id/download', requireAuth, bookController.downloadBook);
router.patch('/deactivate/:id', requireAuth, bookController.deactivateBook);

module.exports = router;