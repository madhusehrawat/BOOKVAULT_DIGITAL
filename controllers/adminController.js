const User      = require('../models/User');
const Book      = require('../models/Book');
const Community = require('../models/Community');
const { cloudinary, extractPublicId } = require('../config/cloudinary');

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
exports.uploadBookPdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No PDF file received' });
        }

        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

        if (book.pdfPath && book.pdfPath.startsWith('http')) {
            const publicId = extractPublicId(book.pdfPath);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                } catch (e) {
                    console.warn('Could not delete old Cloudinary PDF:', e.message);
                }
            }
        }
        book.pdfPath = req.file.path;
        await book.save();

        console.log('[UploadPDF] Saved pdfPath:', book.pdfPath);
        res.json({ success: true, pdfPath: book.pdfPath });
    } catch (err) {
        console.error('uploadBookPdf error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteBookPdf = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

        if (book.pdfPath && book.pdfPath.startsWith('http')) {
            const publicId = extractPublicId(book.pdfPath);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                } catch (e) {
                    console.warn('Cloudinary delete warning:', e.message);
                }
            }
        }

        await Book.findByIdAndUpdate(req.params.id, { $unset: { pdfPath: '' } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteCircle = async (req, res) => {
    try {
        const community = await Community.findByIdAndDelete(req.params.id);
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

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

exports.getUserLibrary = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id).populate('library');
        if (!targetUser) return res.status(404).send('User not found');
        res.render('admin/userLibrary', { targetUser, books: targetUser.library, user: req.user });
    } catch (err) {
        res.status(500).send('Error loading library');
    }
};