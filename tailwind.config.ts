import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#F8F8F8",
        subtle: "#F3F3F3",
        card: "#FFFFFF",
        "text-primary": "#0A0A0A",
        "text-secondary": "#6A6A6A",
        "border-subtle": "#E4E4E7",
        "accent-warm": "#C9A27C",
        "button-bg": "#000000",
        "button-text": "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

