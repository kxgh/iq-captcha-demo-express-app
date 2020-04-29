const express = require('express'),
    commentsProvider = require('../comment-mgr'),
    router = express.Router();

router.get('/', function (req, res, next) {
    res.render('index', {comments: commentsProvider.getComments()});
});

module.exports = router;
