// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cover image storage (multer-storage-cloudinary) ───────────────────────────
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:          'bookvault/covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation:  [{ width: 400, height: 560, crop: 'fill' }],
    },
});

// ── PDF storage (multer-storage-cloudinary) ───────────────────────────────────
// type: 'upload'  →  PUBLIC access, no auth needed (fixes 401)
const pdfStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder:        'bookvault/pdfs',
        resource_type: 'raw',
        type:          'upload',
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
        access_mode: 'public',
    }),
});

// ── Mixed storage: image + PDF in one request (add-book form) ─────────────────
const mixedStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        if (file.fieldname === 'bookPdf') {
            return {
                folder:        'bookvault/pdfs',
                resource_type: 'raw',
                type:          'upload',
                public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
            };
        }
        return {
            folder:          'bookvault/covers',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation:  [{ width: 400, height: 560, crop: 'fill' }],
        };
    },
});

// ── Single image upload ───────────────────────────────────────────────────────
const uploadImage = multer({
    storage: imageStorage,
    limits:  { fileSize: 5 * 1024 * 1024 },
});

// ── Single PDF upload (used by /admin/books/:id/upload-pdf) ──────────────────
const uploadPdf = multer({
    storage: pdfStorage,
    limits:  { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
});

// ── Combined fields upload — image + PDF together ─────────────────────────────
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

// ── Buffer upload helper (used by bookController.addBook with memoryStorage) ──
// Wraps cloudinary.uploader.upload_stream into a Promise
function uploadBufferToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
}

// ── Delete a Cloudinary asset by URL ─────────────────────────────────────────
async function deleteFromCloudinary(url, resourceType = 'raw') {
    try {
        const publicId = extractPublicId(url);
        if (!publicId) return;
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (e) {
        console.warn('Cloudinary delete warning:', e.message);
    }
}

// ── Extract public_id from a Cloudinary URL ───────────────────────────────────
// URL format: https://res.cloudinary.com/CLOUD/raw/upload/v123/bookvault/pdfs/name
function extractPublicId(url) {
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        return parts[1].replace(/^v\d+\//, ''); // strip version prefix
    } catch {
        return null;
    }
}
// Function to check if a PDF exists on Cloudinary
async function checkAssetExists(publicId) {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'raw' // CRITICAL: Must specify 'raw' for PDFs
        });
        return result; // File exists
    } catch (error) {
        if (error.http_code === 404) {
            console.warn(`[Cloudinary] Asset not found: ${publicId}`);
            return null;
        }
        throw error; // Other errors (API limits, network, etc.)
    }
}
module.exports = {
    cloudinary,
    uploadImage,
    uploadPdf,
    uploadFields,
    uploadBufferToCloudinary,
    deleteFromCloudinary,
    extractPublicId,
};