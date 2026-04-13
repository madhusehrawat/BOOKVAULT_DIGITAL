require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS:
//  1. Place your book cover images in:  public/uploads/
//  2. Place your PDF files in:          public/uploads/pdf/
//  3. The filenames below must match exactly what you have on disk.
//     If a book has no PDF yet, set pdfPath: null
//     If a book has no cover yet, the default '/uploads/default-book.png' is used.
// ─────────────────────────────────────────────────────────────────────────────

const seedBooks = [
    // ── FREE BOOKS (isPremium: false) ─────────────────────────────────────────
    {
        title: "The Clean Coder",
        author: "Robert C. Martin",
        isbn: "978-0137081073",
        category: "Development",
        price: 0,
        description: "A Programmers Guide to Professional Conduct. Learn how to deal with conflict, tight schedules, and unreasonable managers while producing high-quality code.",
        image: "/uploads/cleancode.webp",
        pdfPath: "uploads/pdf/clean-coder.pdf",
        isPremium: false,
        isActive: true,
        averageRating: 4.8
    },
    {
        title: "Eloquent JavaScript",
        author: "Marijn Haverbeke",
        isbn: "978-1593279509",
        category: "Development",
        price: 0,
        description: "A modern introduction to programming. This book provides a deep dive into the JavaScript language, covering variables, control structures, functions, and data structures.",
        image: "/uploads/eloquentjs.jpg",
        pdfPath: "uploads/pdf/eloquent-javascript.pdf",
        isPremium: false,
        isActive: true,
        averageRating: 4.7
    },
    {
        title: "Don't Make Me Think",
        author: "Steve Krug",
        isbn: "978-0321965516",
        category: "Design",
        price: 0,
        description: "A common-sense approach to Web Usability. Since it was first published in 2000, hundreds of thousands of Web designers and developers have relied on it for intuitive navigation principles.",
        image: "/uploads/don'tmakemethink.jpg",
        pdfPath: "uploads/pdf/dont-make-me-think.pdf",
        isPremium: false,
        isActive: true,
        averageRating: 4.6
    },
    {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "978-0735211292",
        category: "Self-Help",
        price: 0,
        description: "An easy and proven way to build good habits and break bad ones. Learn the tiny changes that lead to remarkable results in your professional and personal life.",
        image: "/uploads/atomichabits.jpg",
        pdfPath: "uploads/pdf/atomic-habits.pdf",
        isPremium: false,
        isActive: true,
        averageRating: 4.9
    },
    {
        title: "You Don't Know JS Yet",
        author: "Kyle Simpson",
        isbn: "978-1949744354",
        category: "Development",
        price: 0,
        description: "A series of books diving deep into the core mechanisms of the JavaScript language. Focuses on Getting Started with the modern version of the language.",
        image: "/uploads/ydkjs.jpg",
        pdfPath: "uploads/pdf/ydkjs.pdf",
        isPremium: false,
        isActive: true,
        averageRating: 4.7
    },

    // ── PREMIUM BOOKS (isPremium: true) ───────────────────────────────────────
    {
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt",
        isbn: "978-0135957059",
        category: "Development",
        price: 42.50,
        description: "One of the most significant books in software development. Covers topics from personal responsibility to career development and what it means to be a modern programmer.",
        image: "/uploads/pragamaticproggrammer.jpg",
        pdfPath: "uploads/pdf/pragmatic-programmer.pdf",
        isPremium: true,
        isActive: true,
        averageRating: 4.9
    },
    {
        title: "Deep Work",
        author: "Cal Newport",
        isbn: "978-1455586691",
        category: "Productivity",
        price: 22.00,
        description: "Rules for Focused Success in a Distracted World. Deep work is the ability to focus without distraction on a cognitively demanding task—a skill that is becoming increasingly rare.",
        image: "/uploads/deepwork.jpg",
        pdfPath: "uploads/pdf/deep-work.pdf",
        isPremium: true,
        isActive: true,
        averageRating: 4.8
    },
    {
        title: "Zero to One",
        author: "Peter Thiel",
        isbn: "978-0804139298",
        category: "Business",
        price: 21.50,
        description: "Notes on Startups, or How to Build the Future. Thiel argues that true innovation means doing something no one else has done — going from 0 to 1, not 1 to n.",
        image: "/uploads/zerotoone.jpg",
        pdfPath: "uploads/pdf/zero-to-one.pdf",
        isPremium: true,
        isActive: true,
        averageRating: 4.7
    },
    {
        title: "The Psychology of Money",
        author: "Morgan Housel",
        isbn: "978-0857197689",
        category: "Finance",
        price: 19.99,
        description: "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people.",
        image: "/uploads/thepsychologyofmoney.jpg",
        pdfPath: "uploads/pdf/The-Psychology-of-Money.pdf",
        isPremium: true,
        isActive: true,
        averageRating: 4.8
    },
    {
        title: "Designing Data-Intensive Applications",
        author: "Martin Kleppmann",
        isbn: "978-1449373320",
        category: "Software Engineering",
        price: 45.00,
        description: "The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. Understand the trade-offs involved in using different database technologies and architectures.",
        image: "/uploads/designing-data.jpg",
        pdfPath: "uploads/pdf/designing-data-intensive-apps.pdf",
        isPremium: true,
        isActive: true,
        averageRating: 4.9
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Database connected.");

        await Book.deleteMany({});
        console.log("🗑️  Cleared existing books.");

        const inserted = await Book.insertMany(seedBooks);

        const free    = inserted.filter(b => !b.isPremium).length;
        const premium = inserted.filter(b =>  b.isPremium).length;

        console.log(`📚 Seeded ${inserted.length} books  (${free} free · ${premium} premium)`);
        console.log("─────────────────────────────────────────────");
        inserted.forEach(b => {
            const tag = b.isPremium ? "👑 PREMIUM" : "🆓 FREE   ";
            const pdf = b.pdfPath   ? `→ ${b.pdfPath}` : "→ no PDF attached";
            console.log(`   ${tag}  ${b.title.padEnd(42)} ${pdf}`);
        });
        console.log("─────────────────────────────────────────────");
        console.log("✅ Seed complete. Run your server and test downloads.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Seed error:", err.message);
        process.exit(1);
    }
};

seedDB();