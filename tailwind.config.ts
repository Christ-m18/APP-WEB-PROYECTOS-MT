import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a365d',
          light: '#2b6cb0',
        },
        accent: '#e53e3e',
        success: '#276749',
        surface: '#ffffff',
        'text-muted': '#718096',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,.08)',
        md: '0 4px 12px rgba(0,0,0,.10)',
      },
    },
  },
  plugins: [],
} satisfies Config
