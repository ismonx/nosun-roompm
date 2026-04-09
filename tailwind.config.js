/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hostel: {
          bg: '#202e32',
          olive: '#85937a',
          forest: '#586c5c',
          moss: '#a9af90',
          sand: '#dfdcb9',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
