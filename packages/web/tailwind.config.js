/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
    colors: {
      primary: '#484870',
      'text-white': '#EDEDED',
      'text-black': '#334155',
      'background-white': '#F2F2F2',
      white: '#FFFFFF',
      transparent: 'transparent',
    },
  },
  plugins: [],
};
