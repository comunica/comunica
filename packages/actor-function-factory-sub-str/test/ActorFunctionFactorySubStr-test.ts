import { Bus } from '@comunica/core';
import { ActorFunctionFactorySubStr } from '../lib/ActorFunctionFactorySubStr';

describe('ActorFunctionFactorySubStr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySubStr instance', () => {
    let actor: ActorFunctionFactorySubStr;

    beforeEach(() => {
      actor = new ActorFunctionFactorySubStr({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
