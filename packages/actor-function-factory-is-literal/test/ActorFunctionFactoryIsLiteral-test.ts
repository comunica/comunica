import { Bus } from '@comunica/core';
import { ActorFunctionFactoryIsLiteral } from '../lib/ActorFunctionFactoryIsLiteral';

describe('ActorFunctionFactoryIsLiteral', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryIsLiteral instance', () => {
    let actor: ActorFunctionFactoryIsLiteral;

    beforeEach(() => {
      actor = new ActorFunctionFactoryIsLiteral({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
