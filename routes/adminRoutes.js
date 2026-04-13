const express   = require('express');
const router    = express.Router();
const ctrl      = require('../controllers/adminController');
const { requireAuth, isAdmin } = require('../middleware/authMiddleware');
const { uploadPdf } = require('../config/cloudinary');

// All admin routes require auth + admin role
router.use(requireAuth, isAdmin);

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', ctrl.getDashboard);

// ── Books ──────────────────────────────────────────────────────────────────
router.patch('/books/:id', ctrl.updateBook);

// Upload PDF to Cloudinary
router.post('/books/:id/upload-pdf',
    (req, res, next) => {
        uploadPdf.single('bookPdf')(req, res, (err) => {
            if (err) return res.status(400).json({ success: false, message: err.message });
            next();
        });
    },
    ctrl.uploadBookPdf
);

// Delete PDF from Cloudinary + clear DB field
router.delete('/books/:id/delete-pdf', ctrl.deleteBookPdf);

// ── Users ──────────────────────────────────────────────────────────────────
router.post('/toggle-premium/:userId', ctrl.toggleUserPremium);
router.delete('/users/:id',            ctrl.deleteUser);
router.get('/users/:id/library',       ctrl.getUserLibrary);

// ── Communities ─────────────────────────────────────────────────────────────
// IMPORTANT: named route MUST come BEFORE /:id wildcard routes
router.post('/communities/create-super', ctrl.createSuperCommunity);
router.patch('/communities/:id',         ctrl.updateCircle);
router.delete('/communities/:id',        ctrl.deleteCircle);

// ── Posts ──────────────────────────────────────────────────────────────────
router.patch('/posts/:id/pin',  ctrl.togglePinPost);
router.delete('/posts/:id',     ctrl.deletePost);

module.exports = router;