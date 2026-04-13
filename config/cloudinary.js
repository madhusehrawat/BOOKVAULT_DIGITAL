// config/cloudinary.js
// Create this file at: config/cloudinary.js in your project root

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cover image storage ───────────────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:          'bookvault/covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation:  [{ width: 400, height: 560, crop: 'fill' }],
    },
});

// ── PDF storage ───────────────────────────────────────────────────────────────
// resource_type: 'raw' is REQUIRED for non-image files (PDF, ZIP, etc.)
const pdfStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder:        'bookvault/pdfs',
        resource_type: 'raw',
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
    }),
});

const uploadImage = multer({
    storage: imageStorage,
    limits:  { fileSize: 5 * 1024 * 1024 },   // 5 MB max image
});

const uploadPdf = multer({
    storage: pdfStorage,
    limits:  { fileSize: 50 * 1024 * 1024 },   // 50 MB max PDF
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
});

module.exports = { cloudinary, uploadImage, uploadPdf };