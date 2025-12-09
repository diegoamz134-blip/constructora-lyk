// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tus colores personalizados (MANTENLOS)
        lk: {
          darkblue: '#003366',
          blue: '#005b96',
          accent: '#f0c419',
          green: '#4caf50',
        }
      },
      // --- NUEVO: DEFINICIÓN DE LA ANIMACIÓN ---
      keyframes: {
        // Definimos un movimiento sutil de escala (zoom)
        'slow-pan': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' }, // Aumenta un 10% el tamaño
        }
      },
      animation: {
        // Creamos la clase de utilidad.
        // 30s: dura 30 segundos. linear: velocidad constante.
        // infinite: se repite por siempre. alternate: va y vuelve.
        'slow-pan': 'slow-pan 30s linear infinite alternate',
      }
      // ------------------------------------------
    },
  },
  plugins: [],
}