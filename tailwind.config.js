/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1F3A",
          50:  "#f0f3f8",
          100: "#d9e0ec",
          800: "#11243f",
          900: "#0B1F3A",
          950: "#081428",
        },
        gold: {
          DEFAULT: "#F5C84B",
          light:   "#FCE8A8",
          dark:    "#C79A1F",
          600:     "#B8860B",
        },
        ink:     "#0F172A",
        slatebg: "#F7F8FA",
      },
      fontFamily: {
        sans:    ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card:      "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        cardhover: "0 8px 24px rgba(11,31,58,0.10)",
      },
    },
  },
  plugins: [],
};
