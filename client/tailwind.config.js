/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* One neutral system + one accent. Semantic colours (ok / warn / bad) exist only to carry meaning. */
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        subtle: token('subtle'),
        sunken: token('sunken'),
        thumb: token('thumb'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        fg2: token('fg2'),
        fg3: token('fg3'),
        accent: token('accent'),
        'accent-solid': token('accent-solid'),
        'accent-solid-hover': token('accent-solid-hover'),
        ok: token('ok'),
        warn: token('warn'),
        bad: token('bad'),
        'on-accent': token('on-accent'),
        'on-bad': token('on-bad'),
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"', '"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont',
          'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif',
        ],
      },
      /* Typographic hierarchy: hero 56 · title 36 · heading 24 · sub 19 · callout 17 · body 15 · foot 13 · cap 12 */
      fontSize: {
        hero: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
        title: ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        heading: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.022em' }],
        sub: ['1.1875rem', { lineHeight: '1.4', letterSpacing: '-0.014em' }],
        callout: ['1.0625rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }],
        body: ['0.9375rem', { lineHeight: '1.55', letterSpacing: '-0.008em' }],
        foot: ['0.8125rem', { lineHeight: '1.45', letterSpacing: '-0.004em' }],
        cap: ['0.75rem', { lineHeight: '1.35', letterSpacing: '0' }],
      },
      borderRadius: { control: '10px', card: '16px', sheet: '20px' },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      transitionTimingFunction: { ease: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: { fadeIn: 'fadeIn 180ms ease-out both' },
    },
  },
  plugins: [],
};
