import { Bus } from '@comunica/core';
import { ActorFunctionFactoryEncodeForUri } from '../lib/ActorFunctionFactoryEncodeForUri';

describe('ActorFunctionFactoryEncodeForUri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryEncodeForUri instance', () => {
    let actor: ActorFunctionFactoryEncodeForUri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryEncodeForUri({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
