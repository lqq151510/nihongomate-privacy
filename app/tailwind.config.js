/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sakura: {
          50: '#fff5f7',
          100: '#ffeef2',
          200: '#ffd0dc',
          300: '#ffaec2',
          400: '#f86f91',
          500: '#e8436e',
          600: '#d12453',
          700: '#af173f',
          800: '#921738',
          900: '#7d1833',
        },
        indigo: {
          50: '#eef2ff',
          600: '#4f46e5',
          700: '#4338ca',
        }
      },
      fontFamily: {
        japanese: ['"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Meiryo"', '"Noto Sans JP"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
