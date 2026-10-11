import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Brand blue; 600 is the main accent (also the analytics chart color,
        // validated for contrast on white).
        brand: {
          50: '#eff6fe',
          100: '#dcebfc',
          200: '#c0dbfa',
          300: '#94c3f6',
          400: '#61a2ef',
          500: '#3d86e6',
          600: '#2a78d6',
          700: '#2160b4',
          800: '#1f4f91',
          900: '#1e4373',
          950: '#162a49',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.06), 0 1px 3px rgb(15 23 42 / 0.08)',
        'card-hover': '0 4px 12px rgb(15 23 42 / 0.10), 0 2px 4px rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};
