import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionObject } from '../lib/ActorFunctionFactoryTermFunctionObject';

describe('ActorFunctionFactoryTermFunctionObject', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionObject instance', () => {
    let actor: ActorFunctionFactoryTermFunctionObject;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionObject({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
