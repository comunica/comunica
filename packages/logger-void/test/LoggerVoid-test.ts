import {LoggerVoid} from "../lib/LoggerVoid";

describe('LoggerVoid', () => {
  describe('a LoggerVoid instance', () => {

    let logger: LoggerVoid;

    beforeEach(() => {
      logger = new LoggerVoid();
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
    });

    it('should void for debug', () => {
      logger.debug('bla', {});
    });

    it('should void for info', () => {
      logger.info('bla', {});
    });

    it('should void for warn', () => {
      logger.warn('bla', {});
    });

    it('should void for error', () => {
      logger.error('bla', {});
    });

    it('should void for fatal', () => {
      logger.fatal('bla', {});
    });
  });
});
