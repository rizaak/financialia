/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Manrope"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#38bdf8',
          dark: '#0ea5e9',
          light: '#7dd3fc',
        },
        brand: {
          purple: '#a78bfa',
          blue: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
};
