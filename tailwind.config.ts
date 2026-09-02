import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        duston: {
          dark: "#023542",
          accent: "#1BCECE",
          bg: "#FAF9F6",
          card: "#FFFFFF",
          border: "#E8E6E0",
          text: "#2C2C2A",
          muted: "#6B6B65",
          orange: "#F15A24",
          amber: "#FBB03B",
          lime: "#D9E021",
          green: "#39B54A",
        },
      },
      fontFamily: {
        sans: ["var(--font-maven-pro)", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
