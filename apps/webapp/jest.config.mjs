import preset from '@marivo/jest-presets/browser/jest-preset.mjs';

/** @type {import('jest').Config} */
const config = {
  ...preset,
  displayName: 'webapp',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};

export default config;
