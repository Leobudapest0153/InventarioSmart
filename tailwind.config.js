/** Volt-inspired Tailwind config */
import defaultTheme from 'tailwindcss/defaultTheme'

/**** Note ****
 This project uses Tailwind with a Volt-like design system: dark navbar, soft cards, accent primary color.
*/

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef7ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8cc4ff',
          400: '#54a5ff',
          500: '#2f8aff',
          600: '#186cf2',
          700: '#1355c2',
          800: '#1249a0',
          900: '#123f83',
        },
        card: '#ffffff',
        muted: '#f5f7fb',
        border: '#e6e9f2',
        navbar: '#0f172a',
      },
      boxShadow: {
        soft: '0 10px 20px rgba(0,0,0,0.05)',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}

