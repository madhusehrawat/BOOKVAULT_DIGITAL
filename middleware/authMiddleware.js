const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

/**
 * OPTIONAL AUTH: Used for the Navbar and Public Pages.
 * Ensures locals.user is available if a valid token exists.
 */
exports.checkAuth = async (req, res, next) => {
    const token = req.cookies?.token;

    // Default to null
    res.locals.user = null;
    req.user = null;

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id).select("-password");
        
        if (user) {
            req.user = user;
            res.locals.user = user;
        }
    } catch (err) {
        // Token is invalid or expired; we silently fail and stay as 'guest'
        console.error("CheckAuth JWT Error:", err.message);
    }
    next();
};
exports.requirePremium = (req, res, next) => {
    // Check if user exists and is premium
    if (req.user && req.user.isPremium) {
        return next(); // User is premium, proceed to the controller
    }

    // If not premium, block the request
    // You can redirect to a pricing page or send a 403 error
    res.status(403).render('premium-only', {
        title: 'Premium Feature',
        message: 'PDF exporting is a premium feature. Upgrade your Vault to continue.'
    });
};
exports.isAdmin = (req, res, next) => {
    // This assumes your User model has a 'role' field (e.g., role: 'admin' or role: 'user')
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).send("Access Denied: Admins Only");
    }
};

/**
 * REQUIRED AUTH: Used for Dashboard, Cart, and Profile.
 * Forces a redirect to login if no valid session is found.
 */
exports.requireAuth = async (req, res, next) => {
    const token = req.cookies?.token;

    // Prevent caching of protected data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Helper function to handle unauthorized users
    const handleUnauthorized = () => {
        // If it's a Fetch/AJAX request, send 401 JSON
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required. Please log in." 
            });
        }
        // For normal browser navigation, redirect to login
        return res.redirect('/login');
    };

    if (!token) {
        return handleUnauthorized();
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY || SECRET_KEY);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return handleUnauthorized();
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch (err) {
        console.error("RequireAuth JWT Error:", err.message);
        res.clearCookie("token");
        return handleUnauthorized();
    }
};