import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrStarts } from '../lib/ActorFunctionFactoryStrStarts';

describe('ActorFunctionFactoryStrStarts', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrStarts instance', () => {
    let actor: ActorFunctionFactoryStrStarts;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrStarts({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
