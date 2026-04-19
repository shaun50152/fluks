'use strict';

// Mock __ExpoImportMetaRegistry to prevent the lazy getter from trying to
// import an ESM module outside of test scope
Object.defineProperty(global, '__ExpoImportMetaRegistry', {
  value: { url: null },
  configurable: true,
  writable: true,
  enumerable: false,
});
