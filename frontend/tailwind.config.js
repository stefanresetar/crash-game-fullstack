/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      backgroundImage: {
        'radial-dark': 'radial-gradient(circle at center, #1a202c 0%, #000000 100%)',
      }
    },
  },
  plugins: [],
}