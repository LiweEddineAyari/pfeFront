/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#05cd99',
          greenLight: '#34d399',
          greenDark: '#00b386',
          darkGreen: '#0b2318',
          lightBlue: '#39B8FF',
        },
        dark: {
          bg: '#0b1437',
          surface: '#111c44',
          card: '#111c44',
          border: '#1f2b5c',
        },
        light: {
          bg: '#f4f7fe',
          surface: '#ffffff',
          card: '#ffffff',
          border: '#e9edf7',
        },
        // Native mappings to root CSS vars so JIT can use them directly without bracket notation failing
        page: 'var(--bg-page)',
        card: 'var(--bg-card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'border-color': 'var(--color-border)',
        'brand-primary': 'var(--color-primary)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        'card-light': '0 4px 24px rgba(112, 144, 176, 0.10)',
        'card-dark': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
