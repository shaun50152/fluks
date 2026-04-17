'use strict';

// Ensure __ExpoImportMetaRegistry is a plain object, not a lazy getter
// This prevents "import outside test scope" errors when the getter fires
if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
  Object.defineProperty(global, '__ExpoImportMetaRegistry', {
    value: { url: null },
    configurable: true,
    writable: true,
    enumerable: false,
  });
}
