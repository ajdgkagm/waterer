module.exports = {
  plugins: [
    require('tailwindcss'),
    require('@tailwindcss/postcss'), // <-- Add this
    require('autoprefixer'),
  ]
};
