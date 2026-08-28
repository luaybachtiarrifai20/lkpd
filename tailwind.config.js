/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand & tema
        brand: {
          green: '#2E7D32',
          'green-dark': '#1B5E20',
          'green-light': '#E8F5E9',
          teal: '#00695C',
          'teal-dark': '#004D40',
          'teal-light': '#E0F2F1',
          amber: '#F9A825',
          'amber-light': '#FFF8E1',
        },
        // Role accents
        student: '#1565C0',
        teacher: '#4527A0',
        slate: {
          50: '#ECEFF1',
          700: '#37474F',
        },
        success: '#43A047',
        danger: '#E53935',
        neutral: {
          bg: '#FAFAFA',
          DEFAULT: '#FAFAFA',
        },
        // Identitas kegiatan
        activity: {
          1: '#D84315',
          2: '#1565C0',
          3: '#2E7D32',
          4: '#00695C',
        },
      },
      fontFamily: {
        heading: ['"Fredoka"', 'system-ui', 'sans-serif'],
        body: ['"Quicksand"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.06)',
        card: '0 2px 12px rgba(0,0,0,0.07)',
        float: '0 8px 24px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        xl2: '16px',
      },
      maxWidth: {
        content: '1200px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease both',
        'fade-up': 'fadeUp 0.5s ease both',
        'fade-down': 'fadeDown 0.5s ease both',
        'scale-in': 'scaleIn 0.3s ease both',
        'slide-right': 'slideRight 0.4s ease both',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'bubble-rise': 'bubbleRise 3s ease-in infinite',
        'molecule-spin': 'moleculeSpin 20s linear infinite',
        'molecule-spin-rev': 'moleculeSpin 28s linear infinite reverse',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'draw-line': 'drawLine 1.5s ease-out forwards',
        'fill-up': 'fillUp 1.8s ease-out forwards',
        'shake-soft': 'shakeSoft 0.4s ease both',
        pop: 'pop 0.25s ease both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeDown: {
          from: { opacity: 0, transform: 'translateY(-16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        slideRight: {
          from: { opacity: 0, transform: 'translateX(-16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-12px) translateX(4px)' },
        },
        bubbleRise: {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: 0 },
          '20%': { opacity: 0.7 },
          '80%': { opacity: 0.4 },
          '100%': { transform: 'translateY(-40px) scale(1)', opacity: 0 },
        },
        moleculeSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(13, 148, 136, 0.2)' },
          '50%': { boxShadow: '0 0 28px rgba(13, 148, 136, 0.45)' },
        },
        drawLine: {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
        fillUp: {
          from: { height: '0%' },
          to: { height: '100%' },
        },
        shakeSoft: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
