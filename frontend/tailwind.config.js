/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // PrüfPilot — clean black/white design
        primary: {
          DEFAULT: '#000000',
          50: '#F7F7F7',
          100: '#E8E8E8',
          200: '#D1D1D1',
          300: '#B0B0B0',
          400: '#888888',
          500: '#6D6D6D',
          600: '#4A4A4A',
          700: '#333333',
          800: '#1A1A1A',
          900: '#000000',
        },
        accent: '#000000',
        // Traffic light system — muted, modern tones
        ampel: {
          gruen: '#22C55E',
          gelb: '#F59E0B',
          rot: '#EF4444',
        },
        bg: '#FFFFFF',
        surface: '#F9FAFB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
