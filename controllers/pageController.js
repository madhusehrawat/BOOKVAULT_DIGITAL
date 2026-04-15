
exports.getPrivacyPolicy = (req, res) => {
    res.render('privacy', { 
        title: 'Privacy Policy | BookVault',
        user: req.user || null 
    });
};