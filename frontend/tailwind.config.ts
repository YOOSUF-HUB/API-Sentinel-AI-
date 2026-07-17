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
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        // Entrance for trace payloads as they stream in. Starts from the visible
        // end state, so if the animation never runs (reduced motion, headless,
        // hidden tab) the content is still there.
        "trace-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
        "trace-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "trace-in": "trace-in 240ms cubic-bezier(0.25, 1, 0.5, 1) both",
        "trace-pulse": "trace-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
