import { LoggerVoid } from '../lib/LoggerVoid';

describe('LoggerVoid', () => {
  describe('a LoggerVoid instance', () => {
    let logger: LoggerVoid;

    beforeEach(() => {
      logger = new LoggerVoid();
    });

    it('should void for trace', () => {
      logger.trace();
    });

    it('should void for debug', () => {
      logger.debug();
    });

    it('should void for info', () => {
      logger.info();
    });

    it('should void for warn', () => {
      logger.warn();
    });

    it('should void for error', () => {
      logger.error();
    });

    it('should void for fatal', () => {
      logger.fatal();
    });
  });
});
