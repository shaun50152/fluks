'use strict';

const NetInfo = {
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
};

module.exports = { __esModule: true, default: NetInfo };
