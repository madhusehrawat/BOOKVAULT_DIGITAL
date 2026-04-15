const Community = require('../models/Community');
const User      = require('../models/User');

exports.getAllCommunities = async (req, res) => {
    try {
        // Super communities come first, then by member count
        const communities = await Community.find()
            .sort({ isSuper: -1, createdAt: -1 });
        res.render('communities/explore', { communities, user: req.user || null });
    } catch (err) {
        res.status(500).send('Error loading communities');
    }
};

exports.createCommunity = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const community = await Community.create({
            name, category, description,
            members:   [req.user._id],
            createdBy: req.user._id,
            isSuper:   false
        });
        res.json({ success: true, communityId: community._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createSuperCommunity = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const community = await Community.create({
            name, category, description,
            members:   [req.user._id],
            createdBy: req.user._id,
            isSuper:   true
        });
        res.json({ success: true, communityId: community._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getCommunity = async (req, res) => {
    try {
        const community = await Community.findById(req.params.id)
            .populate('posts.author', 'username');
        if (!community) return res.status(404).send('Community not found');

        // Sort posts: pinned first, then newest
        const posts = [...community.posts].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.render('communities/view', { community, posts, user: req.user || null });
    } catch (err) {
        res.status(500).send('Error loading community');
    }
};

exports.toggleJoin = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Login required' });

        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ success: false });

        const isMember = community.members.some(m => m.toString() === req.user._id.toString());
        if (isMember) {
            await Community.findByIdAndUpdate(req.params.id, { $pull: { members: req.user._id } });
        } else {
            await Community.findByIdAndUpdate(req.params.id, { $addToSet: { members: req.user._id } });
        }
        res.json({ success: true, joined: !isMember });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createPost = async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).send('Community not found');

        // Super community: only admin or premium users can post
        if (community.isSuper) {
            const isAdmin   = req.user.role === 'admin';
            const isPremium = req.user.isPremium;
            if (!isAdmin && !isPremium) {
                return res.redirect(`/communities/${req.params.id}?error=premium_required`);
            }
        }

        community.posts.push({
            title:   req.body.title,
            content: req.body.content,
            author:  req.user._id
        });
        await community.save();
        res.redirect(`/communities/${req.params.id}`);
    } catch (err) {
        res.status(500).send('Error creating post');
    }
};

exports.addReply = async (req, res) => {
    try {
        const community = await Community.findOne({ 'posts._id': req.params.postId });
        if (!community) return res.status(404).send('Post not found');

    
        if (community.isSuper) {
            const isAdmin   = req.user.role === 'admin';
            const isPremium = req.user.isPremium;
            if (!isAdmin && !isPremium) {
                return res.redirect(`/communities/${community._id}/posts/${req.params.postId}?error=premium_required`);
            }
        }

        const post = community.posts.id(req.params.postId);
        post.replies.push({
            userId:   req.user._id,
            userName: req.user.username,
            text:     req.body.text
        });
        await community.save();
        res.redirect(`/communities/${community._id}/posts/${req.params.postId}`);
    } catch (err) {
        res.status(500).send('Error adding reply');
    }
};

exports.deleteReply = async (req, res) => {
    try {
        const community = await Community.findOne({ 'posts._id': req.params.postId });
        if (!community) return res.status(404).json({ success: false, message: 'Post not found' });

        const post  = community.posts.id(req.params.postId);
        const reply = post.replies.id(req.params.replyId);

        if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

       
        const isAuthor = reply.userId.toString() === req.user._id.toString();
        const isAdmin  = req.user.role === 'admin';
        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        post.replies.pull({ _id: req.params.replyId });
        await community.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getPost = async (req, res) => {
    try {
        const community = await Community.findById(req.params.communityId)
            .populate('posts.author', 'username');
        if (!community) return res.status(404).send('Community not found');

        const post = community.posts.id(req.params.postId);
        if (!post) return res.status(404).send('Post not found');

        res.render('communities/post-detail', {
            post,
            community,
            communityId: req.params.communityId,
            user: req.user || null
        });
    } catch (err) {
        res.status(500).send('Error loading post');
    }
};