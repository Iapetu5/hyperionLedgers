import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
      },
      boxShadow: {
        soft: "0 10px 40px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(34,211,238,0.35)",
        "glow-magenta": "0 0 28px rgba(232,121,249,0.28)",
        card: "0 4px 24px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
