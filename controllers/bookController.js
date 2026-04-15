const Book        = require('../models/Book');
const path        = require('path');
const User        = require('../models/User');
const fs          = require('fs');
const PDFDocument = require('pdfkit');
const {
    uploadBufferToCloudinary,  // ✅ now exists in cloudinary.js
    deleteFromCloudinary,      // ✅ now exists in cloudinary.js
    extractPublicId            // ✅ now exists in cloudinary.js
} = require('../config/cloudinary');

// 1. Download Library as PDF (generated on-the-fly with pdfkit)
exports.downloadLibraryPDF = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('library');
        if (!user || user.library.length === 0) {
            return res.status(404).send("No books found in your library to download.");
        }
        const doc      = new PDFDocument();
        const filename = `Library_Record_${user.username}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        doc.fontSize(25).text('My BookVault Library', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated for: ${user.username}`, { align: 'right' });
        doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();
        doc.rect(50, doc.y, 500, 2).fill('#2563eb');
        doc.moveDown();
        user.library.forEach((book, index) => {
            doc.fontSize(14).fillColor('#1e293b').text(`${index + 1}. ${book.title}`, { oblique: true });
            doc.fontSize(10).fillColor('#64748b').text(`Author: ${book.author}`);
            doc.text(`Genre: ${book.genre || book.category || 'N/A'}`);
            doc.moveDown(0.5);
        });
        doc.end();
    } catch (err) {
        console.error("PDF Export Error:", err);
        res.status(500).send("Error generating PDF");
    }
};

// 2. Unified Catalog
exports.getAllBooks = async (req, res) => {
    try {
        const { search, price, categories, rating, sort } = req.query;
        let query = { isActive: true };
        if (search) {
            query.$or = [
                { title:  { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } }
            ];
        }
        if (price) query.price = { $lte: parseFloat(price) };
        if (categories && categories.trim() !== '') {
            const catArray = categories.split(',');
            query.category = { $in: catArray.map(cat => new RegExp(`^${cat.trim()}$`, 'i')) };
        }
        if (rating) query.averageRating = { $gte: parseInt(rating) };
        let sortOption = { createdAt: -1 };
        if (sort === 'priceLow')  sortOption = { price: 1 };
        if (sort === 'priceHigh') sortOption = { price: -1 };
        if (sort === 'rating')    sortOption = { averageRating: -1 };
        const books = await Book.find(query).sort(sortOption);
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.render('partials/bookCards', { books });
        }
        res.render('index', { books, searchTerm: search || '', activeCategory: categories || 'all' });
    } catch (error) {
        console.error("Catalog Error:", error);
        res.status(500).send("An error occurred loading the store.");
    }
};

// 3. Post a Review
exports.postReview = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        const newReview = {
            userId:    req.user._id,
            userName:  req.user.username || req.user.name,
            rating:    Number(req.body.rating),
            comment:   req.body.comment,
            createdAt: new Date()
        };
        book.reviews.push(newReview);
        book.averageRating = book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length;
        await book.save();
        res.status(200).json({ success: true, averageRating: book.averageRating.toFixed(1), newReview });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error posting review' });
    }
};

// 4. ── DOWNLOAD A BOOK PDF ───────────────────────────────────────────────────
// pdfPath is a full Cloudinary HTTPS URL stored in MongoDB.
// We redirect the browser directly to that URL — Cloudinary serves the file.
// DO NOT add fl_attachment to the URL — it causes HTTP 401 on free Cloudinary plans.
exports.downloadBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, message: "Book not found." });
        }

        // Premium gate
        if (book.isPremium && !req.user.isPremium && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                isPremiumRequired: true,
                message: "This content is restricted to Premium members only."
            });
        }

        if (!book.pdfPath) {
            return res.status(404).json({ success: false, message: "No PDF file is linked to this book yet." });
        }

        console.log('[Download] pdfPath:', book.pdfPath);

        // ── Cloudinary URL → redirect directly (no fl_attachment — causes 401) ──
        if (book.pdfPath.startsWith('http')) {
            return res.redirect(book.pdfPath);
        }

        // ── Legacy local path fallback ──────────────────────────────────────
        const cleanPath    = book.pdfPath.replace(/^\/+/, '');
        const absolutePath = path.join(__dirname, '..', 'public', cleanPath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({
                success: false,
                message: "PDF not found. Please re-upload through the admin panel."
            });
        }
        res.download(absolutePath, `${book.title}.pdf`, (err) => {
            if (err && !res.headersSent) {
                res.status(500).json({ success: false, message: "Failed to stream the file." });
            }
        });

    } catch (err) {
        console.error("Download Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 5. Admin: Add New Book
// Uses uploadBufferToCloudinary so both image and PDF go to Cloudinary.
// bookRoutes must use multer memoryStorage for this to work — see bookRoutes.js.
exports.addBook = async (req, res) => {
    try {
        const { title, author, isbn, price, category, description, averageRating, isActive, isPremium } = req.body;

        let imagePath   = '/uploads/default-book.png';
        let pdfPath     = null;
        let pdfPublicId = null;

        // Upload cover image to Cloudinary
        if (req.files && req.files.bookImage && req.files.bookImage[0]) {
            const imgResult = await uploadBufferToCloudinary(req.files.bookImage[0].buffer, {
                folder:        'bookvault/covers',
                resource_type: 'image',
                transformation: [{ width: 400, height: 560, crop: 'fill', quality: 'auto' }],
            });
            imagePath = imgResult.secure_url;
        }

        // Upload PDF to Cloudinary
        if (req.files && req.files.bookPdf && req.files.bookPdf[0]) {
            const safeId    = `${Date.now()}-${req.files.bookPdf[0].originalname.replace(/\s+/g, '_').replace(/\.pdf$/i, '')}`;
            const pdfResult = await uploadBufferToCloudinary(req.files.bookPdf[0].buffer, {
                folder:        'bookvault/pdfs',
                resource_type: 'raw',
                type:          'upload',   // PUBLIC — no auth required
                public_id:     safeId,
                format:        'pdf',
            });
            pdfPath     = pdfResult.secure_url;
            pdfPublicId = pdfResult.public_id;
        }

        await Book.create({
            title, author, isbn, category, description,
            price:         parseFloat(price)         || 0,
            averageRating: parseFloat(averageRating) || 5,
            isActive:      isActive  === 'true',
            isPremium:     isPremium === 'true',
            image:         imagePath,
            pdfPath,
            pdfPublicId,
        });

        res.status(201).json({ success: true });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ success: false, message: "ISBN already exists!" });
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. Admin: Deactivate
exports.deactivateBook = async (req, res) => {
    try {
        await Book.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: 'Book archived' });
    } catch (error) {
        res.status(500).json({ message: 'Archive error' });
    }
};

// 7. Admin: Toggle Active Status
exports.toggleStatus = async (req, res) => {
    try {
        await Book.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// 8. Admin: Toggle Premium Status
exports.togglePremium = async (req, res) => {
    try {
        await Book.findByIdAndUpdate(req.params.id, { isPremium: req.body.isPremium });
        res.json({ success: true, isPremium: req.body.isPremium });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// 9. Toggle Reading List
exports.toggleReadingList = async (req, res) => {
    try {
        const user    = await User.findById(req.user._id);
        const bookId  = req.params.id;
        const isAdded = user.library.some(id => id.toString() === bookId.toString());
        if (isAdded) {
            await User.findByIdAndUpdate(req.user._id, { $pull:     { library: bookId } });
        } else {
            await User.findByIdAndUpdate(req.user._id, { $addToSet: { library: bookId } });
        }
        res.json({ success: true, added: !isAdded });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 10. My Library Page
exports.getMyLibrary = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('library');
        if (!user) return res.status(404).send("User not found");
        res.render('library', { books: user.library || [], user: req.user, activePage: 'library' });
    } catch (err) {
        console.error("Library Fetch Error:", err);
        res.status(500).send("Error fetching your library: " + err.message);
    }
};

// 11. GET /books/:id/data — fresh book data for modal
exports.getBookData = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        res.json({ success: true, book });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 12. GET /books/:id/pdf-url — return Cloudinary PDF URL for inline viewer
exports.getPdfUrl = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

        if (book.isPremium && !req.user.isPremium && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                isPremiumRequired: true,
                message: 'Premium membership required to read this book.'
            });
        }

        if (!book.pdfPath) {
            return res.status(404).json({ success: false, message: 'No PDF linked to this book yet.' });
        }

        res.json({ success: true, url: book.pdfPath });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};