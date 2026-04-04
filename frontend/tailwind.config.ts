import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#eff6ff",
        tide: "#0f3d3e",
        coral: "#ef7d57",
        sand: "#f8f3e8",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

