/** @type {import('tailwindcss').Config} */

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    fontSize: {
      'xl': ['18px', { lineHeight: '24px' }],
      '2xl': ['24px', { lineHeight: '30px' }],
      '3xl': ['30px', { lineHeight: '36px' }],
      '4xl': ['36px', { lineHeight: '42px' }],
      '5xl': ['42px', { lineHeight: '48px' }],
    },
    extend: {
      colors: {
        primary: 'black',
      }
    },
  },
  plugins: [],
}