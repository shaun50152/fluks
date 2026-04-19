/**
 * Unit tests for the Logger utility
 */

import { Logger, PipelineStage } from './logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('debug');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('log level filtering', () => {
    it('should output logs at or above the minimum level', () => {
      logger = new Logger('warn');
      
      logger.debug('fetch', 'Debug message');
      logger.info('fetch', 'Info message');
      logger.warn('fetch', 'Warn message');
      logger.error('fetch', 'Error message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      
      const calls = consoleLogSpy.mock.calls;
      const log1 = JSON.parse(calls[0][0]);
      const log2 = JSON.parse(calls[1][0]);
      
      expect(log1.level).toBe('warn');
      expect(log2.level).toBe('error');
    });

    it('should output all logs when level is debug', () => {
      logger = new Logger('debug');
      
      logger.debug('fetch', 'Debug message');
      logger.info('fetch', 'Info message');
      logger.warn('fetch', 'Warn message');
      logger.error('fetch', 'Error message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });

    it('should allow changing the log level dynamically', () => {
      logger = new Logger('info');
      
      logger.debug('fetch', 'Debug message 1');
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
      
      logger.setLevel('debug');
      logger.debug('fetch', 'Debug message 2');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('structured logging format', () => {
    it('should output logs in JSON format with required fields', () => {
      logger.info('fetch', 'Test message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('stage', 'fetch');
      expect(logEntry).toHaveProperty('message', 'Test message');
    });

    it('should include metadata when provided', () => {
      const metadata = { recipeId: '123', count: 5 };
      logger.info('fetch', 'Test message', metadata);

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry).toHaveProperty('metadata');
      expect(logEntry.metadata).toEqual(metadata);
    });

    it('should not include metadata field when not provided', () => {
      logger.info('fetch', 'Test message');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry).not.toHaveProperty('metadata');
    });

    it('should use ISO 8601 timestamp format', () => {
      logger.info('fetch', 'Test message');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      // Validate ISO 8601 format
      const timestamp = new Date(logEntry.timestamp);
      expect(timestamp.toISOString()).toBe(logEntry.timestamp);
    });
  });

  describe('log level methods', () => {
    it('should log debug messages with debug level', () => {
      logger.debug('parse', 'Debug message', { key: 'value' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.level).toBe('debug');
      expect(logEntry.stage).toBe('parse');
      expect(logEntry.message).toBe('Debug message');
      expect(logEntry.metadata).toEqual({ key: 'value' });
    });

    it('should log info messages with info level', () => {
      logger.info('match', 'Info message');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.level).toBe('info');
      expect(logEntry.stage).toBe('match');
    });

    it('should log warn messages with warn level', () => {
      logger.warn('aggregate', 'Warning message');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.level).toBe('warn');
      expect(logEntry.stage).toBe('aggregate');
    });

    it('should log error messages with error level', () => {
      logger.error('store', 'Error message', { error: 'details' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.level).toBe('error');
      expect(logEntry.stage).toBe('store');
      expect(logEntry.metadata).toEqual({ error: 'details' });
    });
  });

  describe('pipeline stages', () => {
    const stages: PipelineStage[] = ['fetch', 'parse', 'match', 'aggregate', 'normalize', 'store', 'config', 'job'];

    stages.forEach((stage) => {
      it(`should support ${stage} stage`, () => {
        logger.info(stage, `Message for ${stage}`);

        const logOutput = consoleLogSpy.mock.calls[0][0];
        const logEntry = JSON.parse(logOutput);

        expect(logEntry.stage).toBe(stage);
      });
    });
  });

  describe('metadata handling', () => {
    it('should handle complex metadata objects', () => {
      const metadata = {
        recipeId: '123',
        ingredients: ['flour', 'sugar'],
        macros: { calories: 200, protein: 10 },
        nested: { deep: { value: true } },
      };

      logger.info('normalize', 'Complex metadata', metadata);

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.metadata).toEqual(metadata);
    });

    it('should handle empty metadata object', () => {
      logger.info('fetch', 'Empty metadata', {});

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.metadata).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle empty message strings', () => {
      logger.info('fetch', '');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.message).toBe('');
    });

    it('should handle messages with special characters', () => {
      const message = 'Message with "quotes" and \n newlines \t tabs';
      logger.info('fetch', message);

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      expect(logEntry.message).toBe(message);
    });

    it('should handle metadata with null values', () => {
      const metadata = { key: null, value: undefined };
      logger.info('fetch', 'Null metadata', metadata);

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logOutput);

      // undefined values are not serialized in JSON
      expect(logEntry.metadata).toEqual({ key: null });
    });
  });
});
