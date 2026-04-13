// middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/pdf'); // Exact folder you requested
    },
    filename: (req, file, cb) => {
        // Renames file to: 17127654321-mybook.pdf
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDFs allowed!'), false);
    }
});

module.exports = upload;