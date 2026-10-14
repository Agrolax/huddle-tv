const path = require('path');

const kepler = path.dirname(require.resolve('@amazon-devices/react-native-kepler/package.json'));

module.exports = {
  // Vega's preset: kepler haste platform, its jest setup and test environment.
  preset: '@amazon-devices/react-native-kepler',
  testRegex: '/test/.*\\.(test|spec)\\.(ts|tsx|js)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  // Workspace packages ship TypeScript source; transform them like app code.
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native|@amazon-devices|@amzn|@huddle)/)'],
  moduleNameMapper: {
    // On device, `react-native` resolves to Vega's fork. Upstream RN 0.72's Pressable drops onFocus/onBlur.
    '^react-native$': kepler,
    '^react-native/(.*)$': `${kepler}/$1`,
    '^@huddle/(shared|tv-focus-kit)$': path.resolve(__dirname, '../../packages/$1/src'),
  },
  coverageDirectory: '.tmp/coverage',
};
