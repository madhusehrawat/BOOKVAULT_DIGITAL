const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Discussion title is required'],
        trim: true,
        maxlength: 200 
    },
    content: { 
        type: String, 
        required: [true, 'Discussion content cannot be empty'] 
    },
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    community: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Community', 
        required: true 
    },
    replies: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);