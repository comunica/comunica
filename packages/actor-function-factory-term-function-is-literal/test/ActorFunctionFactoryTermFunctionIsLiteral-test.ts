import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsLiteral } from '../lib/ActorFunctionFactoryTermFunctionIsLiteral';

describe('ActorFunctionFactoryTermFunctionIsLiteral', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsLiteral instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsLiteral;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsLiteral({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
