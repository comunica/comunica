import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSubStr } from '../lib/ActorFunctionFactoryTermFunctionSubStr';

describe('ActorFunctionFactoryTermFunctionSubStr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSubStr instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSubStr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSubStr({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
