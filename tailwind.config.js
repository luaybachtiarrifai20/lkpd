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
        heading: ['"Plus Jakarta Sans"', '"Poppins"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', '"Source Sans 3"', 'system-ui', 'sans-serif'],
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
    },
  },
  plugins: [],
};
