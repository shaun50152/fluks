'use strict';

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

const mockFunctions = {
  invoke: jest.fn().mockResolvedValue({ data: null, error: new Error('mock') }),
};

const mockStorage = {
  from: jest.fn(() => ({
    upload: jest.fn().mockResolvedValue({ error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock.cdn/file' } }),
    remove: jest.fn().mockResolvedValue({ error: null }),
  })),
};

const supabase = {
  from: mockFrom,
  functions: mockFunctions,
  storage: mockStorage,
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },
};

module.exports = { supabase };
