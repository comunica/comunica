import { Bus } from '@comunica/core';
import { ActorFunctionFactoryLang } from '../lib/ActorFunctionFactoryLang';

describe('ActorFunctionFactoryLang', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryLang instance', () => {
    let actor: ActorFunctionFactoryLang;

    beforeEach(() => {
      actor = new ActorFunctionFactoryLang({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
