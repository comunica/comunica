import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionBnode } from '../lib/ActorFunctionFactoryExpressionFunctionBnode';

describe('ActorFunctionFactoryExpressionFunctionBnode', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionBnode instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionBnode;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionBnode({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
