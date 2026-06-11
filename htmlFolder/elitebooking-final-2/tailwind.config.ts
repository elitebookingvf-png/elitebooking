import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold:  '#C17B4E',
        green: '#27AE60',
        red:   '#EB5757',
      },
      fontFamily: {
        serif: ['"DM Serif Display"','Georgia','serif'],
        sans:  ['"DM Sans"','system-ui','sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
