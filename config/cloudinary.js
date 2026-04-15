// config/cloudinary.js
// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary setup for BookVault
// Add these to your Render environment variables:
//   CLOUDINARY_CLOUD_NAME = your_cloud_name
//   CLOUDINARY_API_KEY    = your_api_key
//   CLOUDINARY_API_SECRET = your_api_secret
// ─────────────────────────────────────────────────────────────────────────────

const cloudinary     = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer         = require('multer');

// Configure Cloudinary credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── STORAGE: Book Cover Images ────────────────────────────────────────────────
// Stored in Cloudinary folder: bookvault/covers
// Allowed formats: jpg, jpeg, png, webp
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:         'bookvault/covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 600, height: 800, crop: 'limit', quality: 'auto' }]
    }
});

// ── STORAGE: Book PDFs ────────────────────────────────────────────────────────
// Stored in Cloudinary folder: bookvault/pdfs
// resource_type MUST be 'raw' for PDF files
const pdfStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder:        'bookvault/pdfs',
        resource_type: 'raw',           // required for PDFs
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace('.pdf', '')}`,
        format:        'pdf'
    })
});

// ── MULTER INSTANCES ──────────────────────────────────────────────────────────
const uploadImage = multer({
    storage: imageStorage,
    limits:  { fileSize: 5 * 1024 * 1024 },  // 5 MB max for images
    fileFilter: (req, file, cb) => {
        if (['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, png, webp) are allowed'), false);
        }
    }
});

const uploadPdf = multer({
    storage: pdfStorage,
    limits:  { fileSize: 50 * 1024 * 1024 },  // 50 MB max for PDFs
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// uploadBoth: handles bookImage (image) + bookPdf (pdf) in a single request
// Uses memoryStorage for multer then uploads each field manually
const uploadBoth = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'bookImage') {
            ['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype)
                ? cb(null, true) : cb(new Error('Only image files allowed for cover'), false);
        } else if (file.fieldname === 'bookPdf') {
            file.mimetype === 'application/pdf'
                ? cb(null, true) : cb(new Error('Only PDF files allowed'), false);
        } else {
            cb(null, false);
        }
    }
}).fields([
    { name: 'bookImage', maxCount: 1 },
    { name: 'bookPdf',   maxCount: 1 }
]);

// ── HELPER: Upload buffer to Cloudinary ───────────────────────────────────────
function uploadBufferToCloudinary(buffer, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
        stream.end(buffer);
    });
}

// ── HELPER: Delete a Cloudinary resource by public_id ─────────────────────────
async function deleteFromCloudinary(publicId, resourceType = 'image') {
    try {
        if (!publicId) return;
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error('Cloudinary delete error:', err.message);
        // Non-fatal — log and continue
    }
}

// ── HELPER: Extract public_id from a Cloudinary URL ──────────────────────────
// e.g. https://res.cloudinary.com/demo/image/upload/v123/bookvault/covers/abc.jpg
//   → bookvault/covers/abc
function extractPublicId(url) {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        // Remove version prefix (v1234567890/) if present
        const withoutVersion = parts[1].replace(/^v\d+\//, '');
        // Remove file extension
        return withoutVersion.replace(/\.[^/.]+$/, '');
    } catch (e) {
        return null;
    }
}

module.exports = {
    cloudinary,
    uploadImage,
    uploadPdf,
    uploadBoth,
    uploadBufferToCloudinary,
    deleteFromCloudinary,
    extractPublicId
};