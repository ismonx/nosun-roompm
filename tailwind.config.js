/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pms: {
          bg: 'var(--pms-bg)',
          'bg-card': 'var(--pms-bg-card)',
          text: 'var(--pms-text)',
          'text-muted': 'var(--pms-text-muted)',
          accent: 'var(--pms-accent)',
          'accent-hover': 'var(--pms-accent-hover)',
          border: 'var(--pms-border)',
          'border-light': 'var(--pms-border-light)',
        },
        status: {
          pending: '#EAB308',
          deposit: '#3B82F6',
          full: '#16A34A',
          closed: '#6B7280',
        }
      },
      fontFamily: {
        heading: 'var(--pms-font-heading)',
        body: 'var(--pms-font-body)',
      },
      borderRadius: {
        'pms': '6px',
      },
      spacing: {
        'pms-gap': 'var(--pms-gap)',
        'pms-pad': 'var(--pms-padding)',
        'pms-cell': 'var(--pms-cell-h)',
      },
    },
  },
  plugins: [],
}
