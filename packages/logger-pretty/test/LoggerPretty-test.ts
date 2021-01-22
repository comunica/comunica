import { LoggerPretty } from '../lib/LoggerPretty';

describe('LoggerPretty', () => {
  beforeEach(() => {
    process.stderr.write = jest.fn();
  });

  describe('a LoggerPretty instance on trace level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'trace' });
    });

    it('should log for trace', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for trace for undefined data', () => {
      logger.trace('bla');
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for trace even when an actor id is set', () => {
      logger.trace('bla', { actor: 'abc' });
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on debug level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'debug' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on info level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'info' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on warn level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'warn' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on error level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'error' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on fatal level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'fatal' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance with an actor whitelist', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      const actors = {
        a: true,
        b: true,
        c: false,
      };
      logger = new LoggerPretty({ level: 'trace', actors });
    });

    it('should log for a whitelisted actor', () => {
      logger.trace('bla', { actor: 'a' });
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for another whitelisted actor', () => {
      logger.trace('bla', { actor: 'b' });
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should not log for a non-whitelisted actor', () => {
      logger.trace('bla', { actor: 'c' });
      return expect(process.stderr.write).not.toHaveBeenCalledTimes(1);
    });

    it('should not log for another non-whitelisted actor', () => {
      logger.trace('bla', { actor: 'd' });
      return expect(process.stderr.write).not.toHaveBeenCalledTimes(1);
    });

    it('should log for empty data', () => {
      logger.trace('bla', {});
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for undefined data', () => {
      logger.trace('bla');
      return expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });
});
