/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/lib/supabase$': '<rootDir>/jest-mocks/supabase-mock.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^expo/src/winter$': '<rootDir>/jest-mocks/emptyMock.js',
    '^expo/src/winter/(.*)$': '<rootDir>/jest-mocks/emptyMock.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/jest-mocks/async-storage-mock.js',
  },
  setupFiles: [
    '<rootDir>/jest-mocks/setup-globals.js',
  ],
  transformIgnorePatterns: [
    'node_modules[\\/](?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry[\\/]react-native|native-base|fast-check))',
  ],
};
