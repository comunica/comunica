import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrStarts } from '../lib/ActorFunctionFactoryTermFunctionStrStarts';

describe('ActorFunctionFactoryTermFunctionStrStarts', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrStarts instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrStarts;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrStarts({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
