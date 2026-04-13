/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content tells Tailwind which files to scan for class names
  content: [
    "./views/**/*.ejs",      // Scans all EJS files in your views folder
    "./public/js/**/*.js",   // Scans all your frontend JS files
    "./public/scripts/**/*.js" 
  ],
  theme: {
    extend: {
      // You can add custom colors here if you want to match your design exactly
      colors: {
        'brand-indigo': '#4f46e5',
      }
    },
  },
  plugins: [],
}