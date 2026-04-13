const Book        = require('../models/Book');
const path        = require('path');
const User        = require('../models/User');
const fs          = require('fs');
const PDFDocument = require('pdfkit');

// 1. Download Library as PDF (generates a summary PDF via pdfkit — no Cloudinary needed)
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
        const { id } = req.params;
        const { comment, rating } = req.body;
        const user = req.user;
        const book = await Book.findById(id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        const newReview = {
            userId:    user._id,
            userName:  user.username || user.name,
            rating:    Number(rating),
            comment,
            createdAt: new Date()
        };
        book.reviews.push(newReview);
        const totalRating = book.reviews.reduce((sum, item) => sum + item.rating, 0);
        book.averageRating = totalRating / book.reviews.length;
        await book.save();
        res.status(200).json({ success: true, averageRating: book.averageRating.toFixed(1), newReview });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error posting review' });
    }
};

// 4. Download a Book PDF
// Works for both Cloudinary URLs (http) and legacy local paths
exports.downloadBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, message: "Book not found." });
        }

        // Premium lock
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

        // ── Cloudinary URL (starts with http) → redirect directly ──────────
        // The browser receives a 302 to the Cloudinary URL and downloads the PDF.
        if (book.pdfPath.startsWith('http')) {
            console.log('[Download] Redirecting to Cloudinary:', book.pdfPath);
            return res.redirect(book.pdfPath);
        }

        // ── Legacy local path fallback ──────────────────────────────────────
        const cleanPath    = book.pdfPath.replace(/^\/+/, '');
        const absolutePath = path.join(__dirname, '..', 'public', cleanPath);

        console.log('[Download] Legacy path:', absolutePath);
        console.log('[Download] File exists:', fs.existsSync(absolutePath));

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({
                success: false,
                message: `PDF not found on server. Please re-upload through the admin panel.`
            });
        }

        res.download(absolutePath, `${book.title}.pdf`, (err) => {
            if (err && !res.headersSent) {
                console.error("[Download] Stream error:", err);
                res.status(500).json({ success: false, message: "Failed to stream the file." });
            }
        });

    } catch (err) {
        console.error("Download Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// 5. Admin: Add New Book
exports.addBook = async (req, res) => {
    try {
        const { title, author, isbn, price, category, description, averageRating, isActive, isPremium } = req.body;

        // req.file is set by uploadImage.single('bookImage') in the route
        // multer-storage-cloudinary puts the permanent HTTPS URL in req.file.path
        const imagePath = req.file
            ? req.file.path                   // Cloudinary URL e.g. https://res.cloudinary.com/...
            : '/uploads/default-book.png';    // fallback if no image uploaded

        // PDF is NOT uploaded at addBook time — admin uploads it separately via
        // POST /admin/books/:id/upload-pdf after the book is created.
        await Book.create({
            title, author, isbn, category, description,
            price:         parseFloat(price) || 0,
            averageRating: parseFloat(averageRating) || 5,
            isActive:      isActive === 'true',
            isPremium:     isPremium === 'true',
            image:         imagePath,
            pdfPath:       null
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
        const { isActive } = req.body;
        await Book.findByIdAndUpdate(req.params.id, { isActive });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// 8. Admin: Toggle Premium Status
exports.togglePremium = async (req, res) => {
    try {
        const { isPremium } = req.body;
        await Book.findByIdAndUpdate(req.params.id, { isPremium });
        res.json({ success: true, isPremium });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// 9. Toggle Reading List
exports.toggleReadingList = async (req, res) => {
    try {
        const userId = req.user._id;
        const bookId = req.params.id;
        const user   = await User.findById(userId);
        const isAdded = user.library.some(id => id.toString() === bookId.toString());
        if (isAdded) {
            await User.findByIdAndUpdate(userId, { $pull:     { library: bookId } });
        } else {
            await User.findByIdAndUpdate(userId, { $addToSet: { library: bookId } });
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