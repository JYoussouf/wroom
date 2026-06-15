/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // The app ships its own hand-written design system; don't let Tailwind's
  // global reset clobber it. Utilities/fonts are still available.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Inter Tight"', "sans-serif"],
        body: ['"Inter Tight"', "sans-serif"],
        sans: ['"Inter Tight"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
