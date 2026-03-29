/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0D47A1',
          dark: '#082654',
          light: '#1565C0',
        },
        brand: {
          purple: '#7B1FA2',
          blue: '#0D47A1',
        },
      },
    },
  },
  plugins: [],
};
