import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStr } from '../lib/ActorFunctionFactoryStr';

describe('ActorFunctionFactoryStr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStr instance', () => {
    let actor: ActorFunctionFactoryStr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStr({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
