import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { navy: '#0A1A3F', crimson: '#E02438', electric: '#2F6BFF', mist: '#EEF2F9', gold: '#FFB703' },
    fontFamily: { heading: ['Poppins', 'sans-serif'], body: ['Inter', 'sans-serif'] },
    maxWidth: { container: '1200px' }, borderRadius: { button: '8px' },
    boxShadow: { card: '0 8px 24px rgba(10,26,63,.08)' }, transitionDuration: { 200: '200ms' }
  } }, plugins: []
} satisfies Config;
