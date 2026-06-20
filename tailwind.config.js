/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './products/*.html',
    './use-cases/*.html',
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
      },
    },
  },
  plugins: [],
}
