import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionEncodeForUri } from '../lib/ActorFunctionFactoryTermFunctionEncodeForUri';

describe('ActorFunctionFactoryTermFunctionEncodeForUri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionEncodeForUri instance', () => {
    let actor: ActorFunctionFactoryTermFunctionEncodeForUri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionEncodeForUri({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
