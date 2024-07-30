import { Bus } from '@comunica/core';
import { ActorFunctionFactoryLesserThan } from '../lib/ActorFunctionFactoryLesserThan';

describe('ActorFunctionFactoryLesserThan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryLesserThan instance', () => {
    let actor: ActorFunctionFactoryLesserThan;

    beforeEach(() => {
      actor = new ActorFunctionFactoryLesserThan({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
