import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionLesserThan } from '../lib/ActorFunctionFactoryTermFunctionLesserThan';

describe('ActorFunctionFactoryTermFunctionLesserThan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionLesserThan instance', () => {
    let actor: ActorFunctionFactoryTermFunctionLesserThan;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionLesserThan({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
