import { Bus } from '@comunica/core';
import { ActorFunctionFactoryAddition } from '../lib/ActorFunctionFactoryAddition';

describe('ActorFunctionFactoryAddition', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryAddition instance', () => {
    let actor: ActorFunctionFactoryAddition;

    beforeEach(() => {
      actor = new ActorFunctionFactoryAddition({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
