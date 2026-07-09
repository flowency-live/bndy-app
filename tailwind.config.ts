import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // brand — rgb-triplet vars support /opacity modifiers
        orange: "rgb(var(--orange-rgb) / <alpha-value>)",
        pink: "rgb(var(--pink-rgb) / <alpha-value>)",
        cyan: "rgb(var(--cyan-rgb) / <alpha-value>)",
        violet: "rgb(var(--violet-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        // semantic (solid or pre-alpha'd)
        surface: "var(--surface)",
        card: "var(--card)",
        line: "var(--line)",
        "line-hi": "var(--line-hi)",
        txt: "var(--txt)",
        dim: "var(--dim)",
        dim2: "var(--dim2)",
        card2: "var(--card2)",
        // skin accents (SKINS-SYSTEM-SPEC.md)
        acc: "var(--acc)",
        "on-acc": "var(--on-acc)",
        acc2: "var(--acc2)",
        "on-acc2": "var(--on-acc2)",
        hl: "var(--hl)",
        "on-hl": "var(--on-hl)",
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"], disp: ["var(--disp)"], meta: ["var(--meta)"] },
      borderRadius: { xl2: "16px", xl3: "22px" },
      transitionTimingFunction: { pop: "cubic-bezier(.2,.9,.3,1.35)", smooth: "cubic-bezier(.4,0,.2,1)" },
      maxWidth: { content: "1400px" },
    },
  },
  plugins: [],
};

export default config;
