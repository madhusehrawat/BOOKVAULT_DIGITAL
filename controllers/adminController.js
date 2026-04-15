const User      = require('../models/User');
const Book      = require('../models/Book');
const Community = require('../models/Community');
const { cloudinary, extractPublicId, deleteFromCloudinary,uploadBufferToCloudinary } = require('../config/cloudinary');

// GET /admin/dashboard
exports.getDashboard = async (req, res) => {
    try {
        const [books, users, communities] = await Promise.all([
            Book.find().sort({ createdAt: -1 }),
            User.find().select('-password').sort({ createdAt: -1 }),
            Community.find().populate('members', '_id').sort({ createdAt: -1 })
        ]);
        const stats = {
            userCount:      users.filter(u => u.role !== 'admin').length,
            communityCount: communities.length,
            recentCircles:  communities
        };
        res.render('admin/dashboard', { books, users, stats, user: req.user });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Error loading dashboard');
    }
};

// POST /admin/toggle-premium/:userId
exports.toggleUserPremium = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.isPremium = !user.isPremium;
        await user.save();
        res.json({ success: true, isPremium: user.isPremium });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Toggle failed' });
    }
};

// PATCH /admin/books/:id
exports.updateBook = async (req, res) => {
    try {
        const allowed = ['title', 'author', 'price', 'averageRating', 'category', 'description', 'isPremium', 'isActive'];
        const update  = {};
        allowed.forEach(key => { if (req.body[key] !== undefined) update[key] = req.body[key]; });
        const book = await Book.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
        res.json({ success: true, book });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getBookPdfUrl = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book || !book.pdfPath) {
            return res.status(404).json({ success: false, message: 'No PDF record found' });
        }

        // 1. Extract the public_id from the stored URL
        const publicId = extractPublicId(book.pdfPath);

        // 2. Verify it actually exists in Cloudinary storage
        const asset = await checkAssetExists(publicId);

        if (!asset) {
            return res.status(404).json({ 
                success: false, 
                message: 'The PDF file is missing from the cloud storage.' 
            });
        }

        // 3. If everything is valid, send the URL
        res.json({ success: true, url: book.pdfPath });
        
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
};

// POST /admin/books/:id/upload-pdf
// req.file.path = permanent Cloudinary HTTPS URL (set by multer-storage-cloudinary)
exports.uploadBookPdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file received' });
        }

        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

        let finalPath = req.file.path;

        // FIX: If path is undefined, it means Multer is using memoryStorage.
        // We must manually stream the buffer to Cloudinary.
        if (!finalPath && req.file.buffer) {
            console.log('[UploadPDF] Path missing, uploading buffer to Cloudinary...');
            
            const result = await uploadBufferToCloudinary(req.file.buffer, {
                folder: 'bookvault/pdfs',
                resource_type: 'raw',
                public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`
            });
            
            finalPath = result.secure_url;
        }

        if (!finalPath) {
            return res.status(500).json({ success: false, message: 'Failed to generate file path' });
        }

        // ... Your existing Cloudinary cleanup logic for the old PDF ...

        book.pdfPath = finalPath;
        await book.save();

        console.log('[UploadPDF] Success! Saved path:', book.pdfPath);
        res.json({ success: true, pdfPath: book.pdfPath });

    } catch (err) {
        console.error('uploadBookPdf error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /admin/books/:id/delete-pdf
exports.deleteBookPdf = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

        if (book.pdfPath && book.pdfPath.startsWith('http')) {
            await deleteFromCloudinary(book.pdfPath, 'raw');
        }

        await Book.findByIdAndUpdate(req.params.id, { $unset: { pdfPath: '', pdfPublicId: '' } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /admin/communities/:id
exports.deleteCircle = async (req, res) => {
    try {
        const community = await Community.findByIdAndDelete(req.params.id);
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /admin/communities/:id
exports.updateCircle = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const update = {};
        if (name)        update.name        = name;
        if (category)    update.category    = category;
        if (description) update.description = description;
        const community = await Community.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
        res.json({ success: true, community });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /admin/communities/create-super
exports.createSuperCommunity = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        if (!name || !category || !description) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }
        const community = new Community({
            name, category, description,
            isSuper:   true,
            members:   [req.user._id],
            createdBy: req.user._id
        });
        await community.save();
        res.json({ success: true, community });
    } catch (err) {
        console.error('create-super error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /admin/posts/:id/pin
exports.togglePinPost = async (req, res) => {
    try {
        const community = await Community.findOne({ 'posts._id': req.params.id });
        if (!community) return res.status(404).json({ success: false, message: 'Post not found' });
        const post = community.posts.id(req.params.id);
        post.isPinned = !post.isPinned;
        await community.save();
        res.json({ success: true, isPinned: post.isPinned });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /admin/posts/:id
exports.deletePost = async (req, res) => {
    try {
        const community = await Community.findOne({ 'posts._id': req.params.id });
        if (!community) return res.status(404).json({ success: false, message: 'Post not found' });
        community.posts.pull({ _id: req.params.id });
        await community.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /admin/users/:id/library
exports.getUserLibrary = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id).populate('library');
        if (!targetUser) return res.status(404).send('User not found');
        res.render('admin/userLibrary', { targetUser, books: targetUser.library, user: req.user });
    } catch (err) {
        res.status(500).send('Error loading library');
    }
};