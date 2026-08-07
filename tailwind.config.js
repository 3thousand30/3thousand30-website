/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './products/*.html',
    './use-cases/*.html',
    './_src/**/*.{njk,md,html,js}',
    './cookie-banner.js',
    './site.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Space Mono', 'monospace'],
      },
      colors: {
        'retro-green': '#00ff41',
        'retro-amber': '#ffb000',
        'warm-gray': '#a8a8a8',
        gray: {
          500: '#8b949e',
          600: '#7d8590',
          700: '#737b86',
          800: '#242a30',
        },
      },
    },
  },
  plugins: [],
}
