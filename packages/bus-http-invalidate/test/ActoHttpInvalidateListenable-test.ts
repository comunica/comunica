import { ActionContext, Bus } from '@comunica/core';
import type { IInvalidateListener } from '..';
import { ActorHttpInvalidateListenable } from '..';

describe('ActorHttpInvalidateListenable', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorHttpInvalidateListenable module', () => {
    it('should be a function', () => {
      expect(ActorHttpInvalidateListenable).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpInvalidateListenable constructor', () => {
      expect(new (<any> ActorHttpInvalidateListenable)({ bus: new Bus({ name: 'bus' }),
        name: 'actor' })).toBeInstanceOf(ActorHttpInvalidateListenable);
    });

    it('should not be able to create new ActorHttpInvalidateListenable objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpInvalidateListenable)(); }).toThrow();
    });
  });

  describe('An ActorHttpInvalidateListenable instance without listeners', () => {
    let actor: ActorHttpInvalidateListenable;
    beforeEach(() => {
      actor = new ActorHttpInvalidateListenable({ bus, name: 'actor' });
    });

    it('should test', () => {
      return expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run({ context: new ActionContext() })).resolves.toBeTruthy();
    });
  });

  describe('An ActorHttpInvalidateListenable instance with listeners', () => {
    let actor: ActorHttpInvalidateListenable;
    let l0: IInvalidateListener;
    let l1: IInvalidateListener;
    beforeEach(() => {
      actor = new ActorHttpInvalidateListenable({ bus, name: 'actor' });
      l0 = jest.fn();
      l1 = jest.fn();
      actor.addInvalidateListener(l0);
      actor.addInvalidateListener(l1);
    });

    it('should test', async() => {
      expect(await actor.test({ context: new ActionContext() })).toBeTruthy();
      expect(l0).not.toHaveBeenCalled();
      expect(l1).not.toHaveBeenCalled();
    });

    it('should run without URL', async() => {
      expect(await actor.run({ context: new ActionContext() })).toBeTruthy();
      expect(l0).toHaveBeenCalledWith({ context: new ActionContext() });
      expect(l1).toHaveBeenCalledWith({ context: new ActionContext() });
    });

    it('should run with URL', async() => {
      expect(await actor.run({ url: 'abc', context: new ActionContext() })).toBeTruthy();
      expect(l0).toHaveBeenCalledWith({ url: 'abc', context: new ActionContext() });
      expect(l1).toHaveBeenCalledWith({ url: 'abc', context: new ActionContext() });
    });
  });
});
