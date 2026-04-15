
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:          'bookvault/covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation:  [{ width: 400, height: 560, crop: 'fill' }],
    },
});

const pdfStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder:        'bookvault/pdfs',
        resource_type: 'raw',
        type:          'upload',      // ← PUBLIC access (fixes 401)
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`,
    }),
});
const mixedStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        if (file.fieldname === 'bookPdf') {
            return {
                folder:        'bookvault/pdfs',
                resource_type: 'raw',
                type:          'upload',   // ← PUBLIC access (fixes 401)
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

const uploadImage = multer({
    storage: imageStorage,
    limits:  { fileSize: 5 * 1024 * 1024 },
});


const uploadPdf = multer({
    storage: pdfStorage,
    limits:  { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
});

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

function extractPublicId(url) {
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        // Remove version prefix e.g. v1776240775/
        return parts[1].replace(/^v\d+\//, '');
    } catch {
        return null;
    }
}

module.exports = { cloudinary, uploadImage, uploadPdf, uploadFields, extractPublicId };