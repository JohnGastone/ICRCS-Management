/** @type {import('tailwindcss').Config} */
// Design tokens are sourced from the shared ICRCS theme so every module
// (ISDMP, Client portal, Biometric Capture) stays visually identical.
// See src/theme/icrcs-theme.js (and icrcs-theme.css for the Tailwind 4 portal).
const icrcsTheme = require('./src/theme/icrcs-theme');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
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
}
