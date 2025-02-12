/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f3f9',
          100: '#e0e7f4',
          200: '#c2cfe8',
          300: '#9db1db',
          400: '#7890cc',
          500: '#5a71bd',
          600: '#34519e', // Main color
          700: '#2d4588',
          800: '#263a71',
          900: '#1f2f5c',
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
        '128': '32rem',
      },
      minHeight: {
        'screen-75': '75vh',
        'screen-85': '85vh',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
};