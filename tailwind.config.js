/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6f1',
          100: '#d5ebe0',
          200: '#aad6c1',
          300: '#74bba0',
          400: '#3d9c7b',
          500: '#1D6B4F',   // primary
          600: '#185e45',
          700: '#12503a',
          800: '#0d3f2d',
          900: '#082d1f',
        },
      },
    },
  },
  plugins: [],
}
