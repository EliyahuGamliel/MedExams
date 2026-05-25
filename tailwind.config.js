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
        // המשתנים הגנריים למצב לילה:
        'dark-bg': '#22262b',       // צבע הרקע המרכזי שביקשת
        'dark-panel': '#2c3138',    // כרטיסיות וכפתורים (טיפה יותר בהיר מהרקע)
        'dark-border': '#3e454e',   // גבולות עדינים לפאנלים
      }
    },
  },
  plugins: [],
}