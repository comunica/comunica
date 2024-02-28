import { KeysCore } from '@comunica/context-entries';
import { LoggerVoid } from '@comunica/logger-void';
import type { IActionContext } from '@comunica/types';
import { ActionContext, Actor, Bus } from '..';

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
      expect(() => {
        (<any> Actor)();
      }).toThrow(`Class constructor Actor cannot be invoked without 'new'`);
    });

    it('should be a Actor constructor with a beforeActors field', () => {
      const beforeActors = [ 'a', 'b' ];
      const b = new Bus({ name: 'bus' });
      const actor = new (<any> Actor)({ name: 'actor', bus: b, beforeActors });
      const map = new Map();
      map.set('a', [ actor ]);
      map.set('b', [ actor ]);
      expect((<any> b).dependencyLinks).toEqual(map);
    });
  });

  describe('An Actor instance', () => {
    const actor = new (<any> Actor)({ name: 'actor', bus });
    actor.run = () => {
      // Do nothing
    };

    beforeEach(() => {
      jest.spyOn(actor, 'run');
      jest.spyOn(bus, 'onRun');
    });

    it('should have a \'name\' field', () => {
      expect(actor.name).toBe('actor');
    });

    it('should have a \'bus\' field', () => {
      expect(actor.bus).toEqual(bus);
    });

    it('should be initializable', async() => {
      await expect(actor.initialize()).resolves.toBeTruthy();
    });

    it('should be deinitializable', async() => {
      await expect(actor.deinitialize()).resolves.toBeTruthy();
    });

    it('should call bus#onRun and actor#run when actor#runObservable is called', () => {
      const action = { myAction: true };
      const output = actor.runObservable(action);
      expect(actor.run).toHaveBeenCalledWith(action);
      expect(bus.onRun).toHaveBeenCalledWith(actor, action, output);
    });

    describe('logger proxy methods without logger', () => {
      const context = new ActionContext({});

      it('should void on trace', () => {
        actor.logTrace(context, 'bla');
      });

      it('should void on debug', () => {
        actor.logDebug(context, 'bla');
      });

      it('should void on info', () => {
        actor.logInfo(context, 'bla');
      });

      it('should void on warn', () => {
        actor.logWarn(context, 'bla');
      });

      it('should void on error', () => {
        actor.logError(context, 'bla');
      });

      it('should void on fatal', () => {
        actor.logFatal(context, 'bla');
      });
    });

    describe('logger proxy methods with logger', () => {
      let logger: LoggerVoid;
      let context: IActionContext;

      beforeEach(() => {
        logger = new LoggerVoid();
        jest.spyOn(logger, 'trace');
        jest.spyOn(logger, 'debug');
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'warn');
        jest.spyOn(logger, 'error');
        jest.spyOn(logger, 'fatal');
        context = new ActionContext({ [KeysCore.log.name]: logger });
      });

      it('should call the logger on trace', () => {
        actor.logTrace(context, 'bla', () => ({}));
        expect(logger.trace).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });

      it('should call the logger on trace without data', () => {
        actor.logTrace(context, 'bla');
        expect(logger.trace).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });

      it('should call the logger on debug', () => {
        actor.logDebug(context, 'bla', () => ({}));
        expect(logger.debug).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });

      it('should call the logger on info', () => {
        actor.logInfo(context, 'bla', () => ({}));
        expect(logger.info).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });

      it('should call the logger on warn', () => {
        actor.logWarn(context, 'bla', () => ({}));
        expect(logger.warn).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });

      it('should call the logger on error', () => {
        actor.logError(context, 'bla', () => ({}));
        expect(logger.error).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });

      it('should call the logger on fatal', () => {
        actor.logFatal(context, 'bla', () => ({}));
        expect(logger.fatal).toHaveBeenCalledWith('bla', { actor: 'actor' });
      });
    });
  });

  describe('#getContextLogger', () => {
    it('for a context without logger should return a falsy value', () => {
      expect(Actor.getContextLogger(new ActionContext({}))).toBeFalsy();
    });

    it('for a context with logger should return the logger', () => {
      const logger = 'blabla';
      expect(Actor.getContextLogger(new ActionContext({ [KeysCore.log.name]: logger }))).toBe(logger);
    });
  });
});
