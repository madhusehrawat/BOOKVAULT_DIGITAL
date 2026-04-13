// config/cloudinary.js
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
// resource_type: 'raw' is REQUIRED for non-image files
const pdfStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder:        'bookvault/pdfs',
        resource_type: 'raw',
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
    }),
});

// ── Mixed storage: routes to correct storage by fieldname ─────────────────────
const mixedStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        if (file.fieldname === 'bookPdf') {
            return {
                folder:        'bookvault/pdfs',
                resource_type: 'raw',
                public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
            };
        }
        // bookImage
        return {
            folder:          'bookvault/covers',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation:  [{ width: 400, height: 560, crop: 'fill' }],
        };
    },
});

// Single image upload (used when only updating image)
const uploadImage = multer({
    storage: imageStorage,
    limits:  { fileSize: 5 * 1024 * 1024 },
});

// Single PDF upload (used for /upload-pdf route)
const uploadPdf = multer({
    storage: pdfStorage,
    limits:  { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
});

// Combined fields upload — handles bookImage + bookPdf in one request (add book form)
const uploadFields = multer({
    storage: mixedStorage,
    limits:  { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'bookPdf' && file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed for bookPdf'), false);
        }
        cb(null, true);
    },
}).fields([
    { name: 'bookImage', maxCount: 1 },
    { name: 'bookPdf',   maxCount: 1 },
]);

// Helper: extract Cloudinary public_id from a URL
// URL: https://res.cloudinary.com/CLOUD/raw/upload/v123/bookvault/pdfs/name
function extractPublicId(url) {
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        return parts[1].replace(/^v\d+\//, ''); // strip version prefix
    } catch {
        return null;
    }
}

module.exports = { cloudinary, uploadImage, uploadPdf, uploadFields, extractPublicId };