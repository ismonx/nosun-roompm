/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hostel: {
          // Light 模式 (文青森林系)
          bg: '#F4F1EA',
          text: '#2C3632',
          moss: '#8A9A5B',
          olive: '#6B7A4A',
          forest: '#4A5A3A',
          sand: '#2C3632',
          // Dark 模式
          'dark-bg': '#1B2420',
          'dark-text': '#D1D7C4',
          'dark-moss': '#C2D5A8',
          'dark-olive': '#8A9A6B',
          'dark-forest': '#3A4A3A',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        serif: ['"Noto Serif TC"', '"Songti SC"', '"STSong"', 'serif'],
      },
      transitionDuration: {
        '500': '500ms',
      }
    },
  },
  plugins: [],
}
