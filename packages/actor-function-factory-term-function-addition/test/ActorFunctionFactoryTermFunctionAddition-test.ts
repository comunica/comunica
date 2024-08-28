import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionAddition } from '../lib/ActorFunctionFactoryTermFunctionAddition';

describe('ActorFunctionFactoryTermFunctionAddition', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionAddition instance', () => {
    let actor: ActorFunctionFactoryTermFunctionAddition;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionAddition({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
