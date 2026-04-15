require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const Book = require('./models/Book');
const authRoutes = require('./routes/authRoutes');
const { checkAuth, requireAuth } = require("./middleware/authMiddleware");
const communityRoutes = require('./routes/communityRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
const connectDB = require('./config/db');
connectDB();


app.use(checkAuth);
app.use('/books', require('./routes/bookRoutes'));
app.use('/communities', communityRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', userRoutes);
app.use('/', contactRoutes);
app.get('/', async (req, res) => {
    try {
        const books = await Book.find({}); 
        res.render('index', { books: books }); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});