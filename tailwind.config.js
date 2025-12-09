/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // AQUÍ AGREGAMOS LA FUENTE
      fontFamily: {
        sans: ['Comfortaa', 'sans-serif'], // Esto reemplaza la fuente por defecto
      },
      colors: {
        // Tus colores personalizados (MANTENLOS)
        lk: {
          darkblue: '#003366',
          blue: '#005b96',
          accent: '#f0c419',
          green: '#4caf50',
        }
      },
      // Tus animaciones (MANTENLAS)
      keyframes: {
        'slow-pan': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' },
        }
      },
      animation: {
        'slow-pan': 'slow-pan 30s linear infinite alternate',
      }
    },
  },
  plugins: [],
}