/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        spark: { primary: '#FCD34D', glow: 'rgba(252, 211, 77, 0.3)' },
        aura:  { primary: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.3)' },
        crown: { primary: '#EAB308', glow: 'rgba(234, 179, 8, 0.3)' },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
