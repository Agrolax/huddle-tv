const path = require('path');

const kepler = path.dirname(require.resolve('@amazon-devices/react-native-kepler/package.json'));

module.exports = {
  // Vega's preset: kepler haste platform, its jest setup and test environment.
  preset: '@amazon-devices/react-native-kepler',
  testRegex: '/test/.*\\.(test|spec)\\.(ts|tsx|js)$',
  testTimeout: 10000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  // Workspace packages ship TypeScript source; transform them like app code.
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native|@amazon-devices|@amzn|@huddle)/)'],
  moduleNameMapper: {
    // On device, `react-native` resolves to Vega's fork. Upstream RN 0.72's Pressable drops onFocus/onBlur.
    '^react-native$': kepler,
    '^react-native/(.*)$': `${kepler}/$1`,
    '^@huddle/shared$': path.resolve(__dirname, '../../packages/shared/src'),
    '^react-native-tv-focus-kit$': path.resolve(__dirname, '../../packages/tv-focus-kit/src'),
    '^@amazon-devices/react-native-qrcode-svg$': '<rootDir>/test/mocks/QRCode.tsx',
    '^@amazon-devices/react-native-svg$': '<rootDir>/test/mocks/svg.tsx',
    '^@amazon-devices/react-native-async-storage__async-storage$': '<rootDir>/test/mocks/asyncStorage.ts',
  },
  coverageDirectory: '.tmp/coverage',
};
