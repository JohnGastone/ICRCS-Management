/** @type {import('tailwindcss').Config} */
// Tailwind 3 apps (CRA / Vite). Design tokens come from the shared ICRCS theme
// so every module stays visually identical. Adjust the require path to wherever
// you drop the theme folder.
const icrcsTheme = require('./src/theme/icrcs-theme');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: icrcsTheme.colors,
      fontSize: icrcsTheme.fontSize,
      fontFamily: icrcsTheme.fontFamily,
      boxShadow: icrcsTheme.boxShadow,
      animation: icrcsTheme.animation,
      keyframes: icrcsTheme.keyframes,
    },
  },
  plugins: [],
};
