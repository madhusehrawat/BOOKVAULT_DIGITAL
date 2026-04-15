const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/communityController');
const { requireAuth, checkAuth, isAdmin } = require('../middleware/authMiddleware');

router.get('/', checkAuth, ctrl.getAllCommunities);
router.get('/:id',checkAuth, ctrl.getCommunity);
router.get('/:communityId/posts/:postId', checkAuth, ctrl.getPost);


router.post('/create', requireAuth, ctrl.createCommunity);
router.post('/:id/join', requireAuth, ctrl.toggleJoin);
router.post('/:id/posts', requireAuth, ctrl.createPost);
router.post('/posts/:postId/replies', requireAuth, ctrl.addReply);
router.delete('/posts/:postId/replies/:replyId', requireAuth, ctrl.deleteReply);

module.exports = router;