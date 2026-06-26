import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark dashboard palette.
        ink: {
          900: "#0a0c10",
          800: "#0f1218",
          700: "#161b24",
          600: "#1e2530",
          500: "#2a3340",
        },
        accent: {
          DEFAULT: "#38bdf8",
          muted: "#0ea5e9",
        },
        severity: {
          critical: "#ef4444",
          warning: "#f59e0b",
          pass: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
