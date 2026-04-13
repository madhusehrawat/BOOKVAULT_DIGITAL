const mongoose = require('mongoose');
const Community = require('./models/Community');
require('dotenv').config(); // Ensure your DB URL is loaded

const seedData = [
    {
        name: "The Dev Engine",
        description: "A hub for full-stack developers to discuss system design, Node.js patterns, and the future of web architecture.",
        category: "Tech",
        bannerImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000",
        members: []
    },
    {
        name: "Noir & Mystery Guild",
        description: "From Sherlock Holmes to modern thrillers. We deconstruct plot twists and share our favorite page-turners.",
        category: "Fiction",
        bannerImage: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1000",
        members: []
    },
    {
        name: "The Growth Mindset",
        description: "Discussing productivity, financial literacy, and psychology. Books that help you build a better version of yourself.",
        category: "Self-Help",
        bannerImage: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1000",
        members: []
    }
];

const runSeed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        await Community.deleteMany(); // Clear existing to avoid duplicates
        await Community.insertMany(seedData);
        console.log("✅ Communities Seeded Successfully!");
        process.exit();
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
};

runSeed();