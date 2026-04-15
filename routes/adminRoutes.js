const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/adminController');
const { requireAuth, isAdmin } = require('../middleware/authMiddleware');
const multer   = require('multer');

// Use memoryStorage — files go to Cloudinary, not disk
const memUpload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files allowed'), false);
    }
});

router.use(requireAuth, isAdmin);
router.get('/dashboard',ctrl.getDashboard);
router.patch('/books/:id',ctrl.updateBook);
router.post('/books/:id/upload-pdf',memUpload.single('bookPdf'), ctrl.uploadBookPdf);
router.delete('/books/:id/delete-pdf',ctrl.deleteBookPdf);
router.post('/toggle-premium/:userId',ctrl.toggleUserPremium);
router.delete('/users/:id',ctrl.deleteUser);
router.get('/users/:id/library',ctrl.getUserLibrary);
//router.post('/promote',ctrl.promoteToAdmin);

router.delete('/communities/:id',ctrl.deleteCircle);
router.patch('/communities/:id',ctrl.updateCircle);
router.post('/communities/create-super',require('../controllers/communityController').createSuperCommunity);

router.patch('/posts/:id/pin', ctrl.togglePinPost);
router.delete('/posts/:id',ctrl.deletePost);

module.exports = router;