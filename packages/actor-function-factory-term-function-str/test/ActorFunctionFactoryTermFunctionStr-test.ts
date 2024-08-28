import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStr } from '../lib/ActorFunctionFactoryTermFunctionStr';

describe('ActorFunctionFactoryTermFunctionStr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStr instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStr({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
