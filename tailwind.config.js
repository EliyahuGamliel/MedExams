/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- השורה הזו חובה! בלי זה Tailwind מתעלם מהקלאס dark
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ודא שכל הקבצים שלך נסרקים
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}