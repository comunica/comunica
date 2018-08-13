import {LoggerVoid} from "../../logger-void/lib/LoggerVoid";
import {ActionContext, Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";
import {KEY_CONTEXT_LOG} from "../lib/Logger";

describe('Actor', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The Actor module', () => {
    it('should be a function', () => {
      expect(Actor).toBeInstanceOf(Function);
    });

    it('should be a Actor constructor', () => {
      expect(new (<any> Actor)({ name: 'actor', bus: new Bus({ name: 'bus' }) })).toBeInstanceOf(Actor);
    });

    it('should not be able to create new Actor objects without \'new\'', () => {
      expect(() => { (<any> Actor)(); }).toThrow();
    });
  });

  describe('An Actor instance', () => {
    const actor = new (<any> Actor)({ name: 'actor', bus });
    actor.run = () => { return; };

    beforeEach(() => {
      jest.spyOn(actor, 'run');
      jest.spyOn(bus, 'onRun');
    });

    it('should have a \'name\' field', () => {
      expect(actor.name).toEqual('actor');
    });

    it('should have a \'bus\' field', () => {
      expect(actor.bus).toEqual(bus);
    });

    it('should be initializable', () => {
      return expect(actor.initialize()).resolves.toBeTruthy();
    });

    it('should be deinitializable', () => {
      return expect(actor.deinitialize()).resolves.toBeTruthy();
    });

    it('should call bus#onRun and actor#run when actor#runObservable is called', () => {
      const action = { myAction: true };
      const output = actor.runObservable(action);
      expect(actor.run).toBeCalledWith(action);
      expect(bus.onRun).toBeCalledWith(actor, action, output);
    });

    describe('logger proxy methods without logger', () => {
      const context = ActionContext({});

      it('should void on trace', () => {
        return actor.logTrace(context, 'bla');
      });

      it('should void on debug', () => {
        return actor.logDebug(context, 'bla');
      });

      it('should void on info', () => {
        return actor.logInfo(context, 'bla');
      });

      it('should void on warn', () => {
        return actor.logWarn(context, 'bla');
      });

      it('should void on error', () => {
        return actor.logError(context, 'bla');
      });

      it('should void on fatal', () => {
        return actor.logFatal(context, 'bla');
      });
    });

    describe('logger proxy methods with logger', () => {
      let logger;
      let context;

      beforeEach(() => {
        logger = new LoggerVoid();
        jest.spyOn(logger, 'trace');
        jest.spyOn(logger, 'debug');
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'warn');
        jest.spyOn(logger, 'error');
        jest.spyOn(logger, 'fatal');
        context = ActionContext({ [KEY_CONTEXT_LOG]: logger });
      });

      it('should call the logger on trace', () => {
        actor.logTrace(context, 'bla', {});
        return expect(logger.trace).toBeCalledWith('bla', {});
      });

      it('should call the logger on debug', () => {
        actor.logDebug(context, 'bla', {});
        return expect(logger.debug).toBeCalledWith('bla', {});
      });

      it('should call the logger on info', () => {
        actor.logInfo(context, 'bla', {});
        return expect(logger.info).toBeCalledWith('bla', {});
      });

      it('should call the logger on warn', () => {
        actor.logWarn(context, 'bla', {});
        return expect(logger.warn).toBeCalledWith('bla', {});
      });

      it('should call the logger on error', () => {
        actor.logError(context, 'bla', {});
        return expect(logger.error).toBeCalledWith('bla', {});
      });

      it('should call the logger on fatal', () => {
        actor.logFatal(context, 'bla', {});
        return expect(logger.fatal).toBeCalledWith('bla', {});
      });
    });
  });

  describe('#getContextLogger', () => {
    it('for a falsy context should return a falsy value', () => {
      return expect(Actor.getContextLogger(null)).toBeFalsy();
    });

    it('for a context without logger should return a falsy value', () => {
      return expect(Actor.getContextLogger(ActionContext({}))).toBeFalsy();
    });

    it('for a context with logger should return the logger', () => {
      const logger = 'blabla';
      return expect(Actor.getContextLogger(ActionContext({ [KEY_CONTEXT_LOG]: logger }))).toBe(logger);
    });
  });
});
